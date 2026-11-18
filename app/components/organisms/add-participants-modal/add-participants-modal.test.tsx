import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { adminAddParticipantsCopy } from "~/copy/admin/add-participants"
import { AddParticipantsModal } from "./add-participants-modal"

const { modal } = adminAddParticipantsCopy

const eventId = "e1"

const found = (rows: unknown[]) =>
  Response.json({ ok: true, results: rows }) as Response

const person = (overrides: Record<string, unknown> = {}) => ({
  id: "p1",
  full_name: "Maria Silva",
  social_name: null,
  email: "maria@test.com",
  phone: null,
  is_participant: false,
  ...overrides,
})

const renderModal = (onAdded = vi.fn()) => {
  render(
    <MemoryRouter>
      <AddParticipantsModal
        open
        onOpenChange={() => {}}
        eventId={eventId}
        onAdded={onAdded}
      />
    </MemoryRouter>,
  )
  return { onAdded }
}

const lastBody = (fetchSpy: ReturnType<typeof vi.spyOn>) =>
  JSON.parse(
    (fetchSpy.mock.calls.at(-1)?.[1] as RequestInit).body as string,
  ) as Record<string, unknown>

describe("the add participants modal", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch")
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const search = async (
    user: ReturnType<typeof userEvent.setup>,
    term: string,
  ) => {
    await user.type(screen.getByLabelText(modal.searchLabel), term)
  }

  it("says who can be found", () => {
    renderModal()

    expect(screen.getByText(modal.searchHelp)).toBeVisible()
  })

  it("will not select someone already registered", async () => {
    const user = userEvent.setup()
    fetchSpy.mockResolvedValue(
      found([person({ full_name: "Já Inscrita", is_participant: true })]),
    )
    renderModal()

    await search(user, "ja")

    expect(
      await screen.findByRole("button", { name: modal.alreadyParticipant }),
    ).toBeDisabled()
  })

  it("selects several people, each starting on a regular spot", async () => {
    const user = userEvent.setup()
    fetchSpy.mockResolvedValue(
      found([
        person(),
        person({ id: "p2", full_name: "Ana Souza" }),
      ]),
    )
    renderModal()

    await search(user, "a")
    const buttons = await screen.findAllByRole("button", { name: modal.select })
    await user.click(buttons[0])
    await user.click(buttons[1])

    expect(
      screen.getByRole("combobox", { name: modal.spotTypeLabel("Maria Silva") }),
    ).toHaveTextContent("Regular")
    expect(
      screen.getByRole("combobox", { name: modal.spotTypeLabel("Ana Souza") }),
    ).toHaveTextContent("Regular")
    expect(
      screen.getByRole("button", { name: modal.submit(2) }),
    ).toBeEnabled()
  })

  it("sends each person with the spot type the admin chose", async () => {
    const user = userEvent.setup()
    fetchSpy.mockResolvedValue(found([person()]))
    renderModal()

    await search(user, "maria")
    await user.click(await screen.findByRole("button", { name: modal.select }))
    await user.click(
      screen.getByRole("combobox", { name: modal.spotTypeLabel("Maria Silva") }),
    )
    await user.click(await screen.findByRole("option", { name: "Staff" }))

    fetchSpy.mockResolvedValue(
      Response.json({
        ok: true,
        outcomes: [{ profileId: "p1", outcome: "added" }],
      }) as Response,
    )
    await user.click(screen.getByRole("button", { name: modal.submit(1) }))

    await waitFor(() =>
      expect(lastBody(fetchSpy)).toEqual({
        intent: "add",
        eventId,
        people: [{ profileId: "p1", spotType: "staff" }],
      }),
    )
  })

  it("reports what happened to each person and lets the page refresh", async () => {
    const user = userEvent.setup()
    fetchSpy.mockResolvedValue(
      found([person(), person({ id: "p2", full_name: "Ana Souza" })]),
    )
    const { onAdded } = renderModal()

    await search(user, "a")
    const buttons = await screen.findAllByRole("button", { name: modal.select })
    await user.click(buttons[0])
    await user.click(buttons[1])

    fetchSpy.mockResolvedValue(
      Response.json({
        ok: true,
        outcomes: [
          { profileId: "p1", outcome: "reactivated" },
          { profileId: "p2", outcome: "ineligible" },
        ],
      }) as Response,
    )
    await user.click(screen.getByRole("button", { name: modal.submit(2) }))

    const results = await screen.findByRole("region", {
      name: modal.resultsTitle,
    })
    expect(
      within(results).getByText(
        modal.outcomeLine("Maria Silva", modal.outcome.reactivated),
      ),
    ).toBeVisible()
    expect(
      within(results).getByText(
        modal.outcomeLine("Ana Souza", modal.outcome.ineligible),
      ),
    ).toBeVisible()
    expect(onAdded).toHaveBeenCalled()
  })

  const addOne = async (
    user: ReturnType<typeof userEvent.setup>,
    outcome = "added",
  ) => {
    fetchSpy.mockResolvedValue(found([person()]))
    await search(user, "maria")
    await user.click(await screen.findByRole("button", { name: modal.select }))
    fetchSpy.mockResolvedValue(
      Response.json({
        ok: true,
        outcomes: [{ profileId: "p1", outcome }],
      }) as Response,
    )
    await user.click(screen.getByRole("button", { name: modal.submit(1) }))
    await screen.findByRole("region", { name: modal.resultsTitle })
  }

  it("clears the search once people are added, so nobody looks selectable again", async () => {
    const user = userEvent.setup()
    renderModal()

    await addOne(user)

    expect(screen.getByLabelText(modal.searchLabel)).toHaveValue("")
    expect(
      screen.queryByRole("button", { name: modal.select }),
    ).not.toBeInTheDocument()
  })

  it("drops the previous results when the next addition starts", async () => {
    const user = userEvent.setup()
    renderModal()

    await addOne(user, "reactivated")

    fetchSpy.mockResolvedValue(found([person()]))
    await search(user, "maria")
    await user.click(await screen.findByRole("button", { name: modal.select }))
    fetchSpy.mockRejectedValue(new Error("offline"))
    await user.click(screen.getByRole("button", { name: modal.submit(1) }))

    await screen.findByRole("alert")
    expect(
      screen.queryByRole("region", { name: modal.resultsTitle }),
    ).not.toBeInTheDocument()
  })

  it("lets the admin take someone back off the selection", async () => {
    const user = userEvent.setup()
    fetchSpy.mockResolvedValue(found([person()]))
    renderModal()

    await search(user, "maria")
    await user.click(await screen.findByRole("button", { name: modal.select }))
    await user.click(
      screen.getByRole("button", { name: modal.remove("Maria Silva") }),
    )

    expect(screen.getByText(modal.noneSelected)).toBeVisible()
  })

  it("shows the reason the server gives for a refusal", async () => {
    const user = userEvent.setup()
    fetchSpy.mockResolvedValue(found([person()]))
    renderModal()

    await search(user, "maria")
    await user.click(await screen.findByRole("button", { name: modal.select }))

    fetchSpy.mockResolvedValue(
      Response.json(
        { ok: false, error: adminAddParticipantsCopy.notAccepting },
        { status: 422 },
      ) as Response,
    )
    await user.click(screen.getByRole("button", { name: modal.submit(1) }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      adminAddParticipantsCopy.notAccepting,
    )
  })

  it("says the addition failed when the server cannot be reached", async () => {
    const user = userEvent.setup()
    fetchSpy.mockResolvedValue(found([person()]))
    renderModal()

    await search(user, "maria")
    await user.click(await screen.findByRole("button", { name: modal.select }))

    fetchSpy.mockRejectedValue(new Error("offline"))
    await user.click(screen.getByRole("button", { name: modal.submit(1) }))

    expect(await screen.findByRole("alert")).toHaveTextContent(modal.failed)
  })
})
