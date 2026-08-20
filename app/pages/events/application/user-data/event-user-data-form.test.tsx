import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { eventApplicationCopy } from "~/copy/events"
import { formRuntimeCopy } from "~/copy/forms"
import EventUserInfo from "./event-user-data"

vi.mock("~/business/auth/auth.server", () => ({ getUserContext: vi.fn() }))
vi.mock("~/business/session.server", () => ({
  rulesSessionStorage: { getSession: vi.fn(), commitSession: vi.fn() },
}))

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>()

  return { ...actual, useNavigate: () => navigate }
})

const { toast } = vi.hoisted(() => ({
  toast: { warning: vi.fn(), error: vi.fn() },
}))
vi.mock("sonner", () => ({ toast }))

const { track } = vi.hoisted(() => ({ track: vi.fn() }))
vi.mock("~/lib/hooks/use-analytics", () => ({
  useAnalytics: () => ({ track }),
}))

const EVENT = "11111111-1111-4111-8111-111111111111"

const answered = (body: unknown, status = 200) =>
  vi.fn().mockResolvedValue({
    status,
    json: () => Promise.resolve(body),
  })

const renderForm = () =>
  render(
    <MemoryRouter initialEntries={[`/dashboard/${EVENT}/dados`]}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <EventUserInfo {...({ params: { id: EVENT } } as any)} />
    </MemoryRouter>,
  )

const fillAndSend = async () => {
  const user = userEvent.setup()

  await screen.findByText(eventApplicationCopy.labels.referred)

  await user.type(
    screen.getByRole("textbox", {
      name: new RegExp(eventApplicationCopy.labels.referred.slice(0, 20)),
    }),
    "ninguém",
  )

  await user.click(screen.getByRole("radio", { name: "Posso ir sozinhe." }))
  await user.click(
    screen.getByRole("button", { name: eventApplicationCopy.submitLabel }),
  )
}

describe("the event application form", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    vi.stubGlobal("fetch", answered({ ok: true, emailSent: true }))
  })

  it("asks the five questions the application has always asked", async () => {
    renderForm()

    for (const label of Object.values(eventApplicationCopy.labels)) {
      expect(await screen.findByText(label)).toBeInTheDocument()
    }
  })

  it("sends the answers to the application endpoint", async () => {
    renderForm()
    await fillAndSend()

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `/api/events/${EVENT}/application`,
        expect.objectContaining({ method: "POST" }),
      )
    })

    const [, sent] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(String(sent?.body))).toMatchObject({
      referred: "ninguém",
      bond: "Posso ir sozinhe.",
    })
  })

  it("counts the click that sends an application", async () => {
    renderForm()
    await fillAndSend()

    expect(track).toHaveBeenCalledWith("event_application_clicked", {
      eventId: EVENT,
    })
  })

  it("takes a finished application to the confirmation page", async () => {
    renderForm()
    await fillAndSend()

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(
        `/dashboard/${EVENT}/candidatura-enviada`,
      )
    })

    expect(toast.warning).not.toHaveBeenCalled()
  })

  it("warns about the e-mail without claiming the application failed", async () => {
    vi.stubGlobal("fetch", answered({ ok: true, emailSent: false }))

    renderForm()
    await fillAndSend()

    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalledWith(
        eventApplicationCopy.toasts.emailFailed.message,
        expect.objectContaining({
          description: eventApplicationCopy.toasts.emailFailed.description,
        }),
      )
    })

    expect(navigate).toHaveBeenCalledWith(
      `/dashboard/${EVENT}/candidatura-enviada`,
    )
  })

  it("sends a browser whose quiz expired back to the quiz", async () => {
    vi.stubGlobal("fetch", answered({ ok: false, errors: [] }, 403))

    renderForm()
    await fillAndSend()

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(`/dashboard/${EVENT}/regras`)
    })
  })

  it("says the quiz expired rather than to try again", async () => {
    vi.stubGlobal("fetch", answered({ ok: false, errors: [] }, 403))

    renderForm()
    await fillAndSend()

    expect(
      await screen.findByText(eventApplicationCopy.quizExpired),
    ).toBeInTheDocument()

    // The route takes a moment to swap, and until it does the runtime's own
    // "try again" would be sitting under the button telling the person to do
    // the one thing that cannot work.
    expect(
      screen.queryByText(formRuntimeCopy.commitFailed),
    ).not.toBeInTheDocument()
  })

  it("keeps the person on the form when the application is refused", async () => {
    vi.stubGlobal(
      "fetch",
      answered({ ok: false, errors: [], message: "Inscrições encerradas" }),
    )

    renderForm()
    await fillAndSend()

    expect(await screen.findByText("Inscrições encerradas")).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it("says why, rather than telling the person to try again", async () => {
    vi.stubGlobal(
      "fetch",
      answered({ ok: false, errors: [], message: "Inscrições encerradas" }),
    )

    renderForm()
    await fillAndSend()

    await screen.findByText("Inscrições encerradas")

    // Retrying is exactly what will not help, and the two messages sat on
    // screen together: the reason as a toast, the invitation to retry inline.
    expect(
      screen.queryByText(formRuntimeCopy.commitFailed),
    ).not.toBeInTheDocument()
    expect(toast.error).not.toHaveBeenCalled()
  })
})
