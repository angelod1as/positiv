import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { EventInviteRow } from "~/business/admin/event-invites.server"
import { adminInvitesCopy } from "~/copy/admin/invites"
import { EventInviteModal } from "./event-invite-modal"

const { modal } = adminInvitesCopy

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

const invite = (overrides: Partial<EventInviteRow> = {}): EventInviteRow =>
  ({
    id: "i1",
    event_id: eventId,
    profile_id: "p1",
    token: "tok123",
    created_at: new Date().toISOString(),
    used_at: null,
    revoked_at: null,
    full_name: "Maria Silva",
    social_name: null,
    ...overrides,
  }) as EventInviteRow

const renderModal = (
  props: Partial<Parameters<typeof EventInviteModal>[0]> = {},
) =>
  render(
    <MemoryRouter>
      <EventInviteModal
        open
        onOpenChange={() => {}}
        eventId={eventId}
        invites={[]}
        participants={[]}
        {...props}
      />
    </MemoryRouter>,
  )

const spyOnFetch = () => vi.spyOn(globalThis, "fetch")

describe("the invite modal", () => {
  let fetchSpy: ReturnType<typeof spyOnFetch>

  beforeEach(() => {
    fetchSpy = spyOnFetch()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("explains what can be searched", () => {
    renderModal()

    expect(screen.getByText(modal.searchHelp)).toBeVisible()
  })

  it("shows what the search found", async () => {
    const user = userEvent.setup()
    fetchSpy.mockResolvedValue(found([person()]))
    renderModal()

    await user.type(screen.getByLabelText(modal.searchLabel), "maria")

    expect(await screen.findByText("Maria Silva")).toBeVisible()
    expect(
      screen.getByRole("button", { name: modal.invite }),
    ).toBeEnabled()
  })

  it("will not invite someone already registered", async () => {
    const user = userEvent.setup()
    fetchSpy.mockResolvedValue(
      found([
        person({ id: "p2", full_name: "Já Inscrita", is_participant: true }),
      ]),
    )
    renderModal()

    await user.type(screen.getByLabelText(modal.searchLabel), "ja")

    expect(
      await screen.findByRole("button", { name: modal.alreadyParticipant }),
    ).toBeDisabled()
  })

  it("asks the endpoint to create the invite", async () => {
    const user = userEvent.setup()
    fetchSpy.mockResolvedValue(found([person()]))
    renderModal()

    await user.type(screen.getByLabelText(modal.searchLabel), "maria")
    await screen.findByText("Maria Silva")

    fetchSpy.mockResolvedValue(
      Response.json({ ok: true, invites: [] }) as Response,
    )

    await user.click(screen.getByRole("button", { name: modal.invite }))

    await waitFor(() => {
      const bodies = fetchSpy.mock.calls.map(([, init]) =>
        JSON.parse(String((init as RequestInit).body)),
      )
      expect(bodies).toContainEqual({
        intent: "create",
        eventId,
        profileId: "p1",
      })
    })
  })

  it("marks a row whose invite it has just generated", async () => {
    const user = userEvent.setup()
    fetchSpy.mockResolvedValue(found([person()]))
    renderModal()

    await user.type(screen.getByLabelText(modal.searchLabel), "maria")
    await screen.findByText("Maria Silva")

    fetchSpy.mockResolvedValue(
      Response.json({ ok: true, invites: [invite()] }) as Response,
    )

    await user.click(screen.getByRole("button", { name: modal.invite }))

    // The search stays on screen -- inviting three people should not mean
    // typing three times -- so the row itself has to say what happened.
    expect(
      await screen.findByRole("button", { name: modal.alreadyInvited }),
    ).toBeDisabled()
  })

  it("still offers the invite to somebody whose invite was revoked", async () => {
    const user = userEvent.setup()
    fetchSpy.mockResolvedValue(found([person()]))
    renderModal({
      invites: [invite({ revoked_at: new Date().toISOString() })],
    })

    await user.type(screen.getByLabelText(modal.searchLabel), "maria")

    expect(
      await screen.findByRole("button", { name: modal.invite }),
    ).toBeEnabled()
  })

  it("shows the link of an invite that already exists", () => {
    renderModal({ invites: [invite()] })

    expect(screen.getByDisplayValue(/\/convite\/tok123$/)).toBeVisible()
    expect(screen.getByRole("button", { name: modal.revoke })).toBeVisible()
  })

  it("says which invites are spent and which were called off", () => {
    renderModal({
      invites: [
        invite({ id: "i1", used_at: new Date().toISOString() }),
        invite({
          id: "i2",
          profile_id: "p2",
          token: "tok456",
          full_name: "Outra Pessoa",
          revoked_at: new Date().toISOString(),
        }),
      ],
    })

    expect(
      screen.getByText(modal.inviteLine("Maria Silva", modal.status.used)),
    ).toBeVisible()
    expect(
      screen.getByText(modal.inviteLine("Outra Pessoa", modal.status.revoked)),
    ).toBeVisible()
  })

  it("will not revoke what is already revoked", () => {
    renderModal({
      invites: [invite({ revoked_at: new Date().toISOString() })],
    })

    expect(screen.getByRole("button", { name: modal.revoke })).toBeDisabled()
  })

  it("says so when the invite could not be generated", async () => {
    const user = userEvent.setup()
    fetchSpy.mockResolvedValue(found([person()]))
    renderModal()

    await user.type(screen.getByLabelText(modal.searchLabel), "maria")
    await screen.findByText("Maria Silva")

    fetchSpy.mockResolvedValue(
      Response.json({ ok: false }, { status: 422 }) as Response,
    )

    await user.click(screen.getByRole("button", { name: modal.invite }))

    expect(await screen.findByText(modal.failed)).toBeVisible()
  })

  it("says so when the revocation could not go through", async () => {
    const user = userEvent.setup()
    renderModal({ invites: [invite()] })

    fetchSpy.mockResolvedValue(
      Response.json({ ok: false }, { status: 500 }) as Response,
    )

    await user.click(screen.getByRole("button", { name: modal.revoke }))

    expect(await screen.findByText(modal.revokeFailed)).toBeVisible()
  })

  it("does not leave the buttons disabled when the request never lands", async () => {
    const user = userEvent.setup()
    renderModal({ invites: [invite()] })

    fetchSpy.mockRejectedValue(new Error("offline"))

    await user.click(screen.getByRole("button", { name: modal.revoke }))

    expect(await screen.findByText(modal.revokeFailed)).toBeVisible()
    await waitFor(() =>
      expect(screen.getByRole("button", { name: modal.revoke })).toBeEnabled(),
    )
  })

  it("ignores a search answer that arrives after a newer one", async () => {
    const user = userEvent.setup()

    // The slow answer belongs to the earlier keystrokes; the quick one to what
    // the admin is actually looking at.
    let resolveSlow: (value: Response) => void = () => {}
    const slow = new Promise<Response>((resolve) => {
      resolveSlow = resolve
    })

    fetchSpy.mockReturnValueOnce(slow)
    fetchSpy.mockResolvedValue(found([person({ id: "p2", full_name: "Nova Busca" })]))

    renderModal()

    const field = screen.getByLabelText(modal.searchLabel)
    await user.type(field, "ma")
    await new Promise((resolve) => setTimeout(resolve, 400))
    await user.type(field, "ria")

    expect(await screen.findByText("Nova Busca")).toBeVisible()

    resolveSlow(found([person({ id: "p1", full_name: "Busca Antiga" })]))

    await waitFor(() =>
      expect(screen.queryByText("Busca Antiga")).not.toBeInTheDocument(),
    )
    expect(screen.getByText("Nova Busca")).toBeVisible()
  })

  it("lists who is already registered", () => {
    renderModal({
      participants: [{ id: "p9", full_name: "Já Dentro", social_name: null }],
    })

    expect(screen.getByText("Já Dentro")).toBeVisible()
  })

  it("says so when there is nothing to list yet", () => {
    renderModal()

    expect(screen.getByText(modal.noInvites)).toBeVisible()
    expect(screen.getByText(modal.noParticipants)).toBeVisible()
  })
})
