import { beforeEach, describe, expect, it, vi } from "vitest"
import { action } from "./submit-application"

vi.mock("~/business/auth/auth.server", () => ({
  getUserContext: vi.fn().mockResolvedValue({ currentProfile: { id: "me" } }),
}))

vi.mock("~/business/session.server", () => ({
  rulesSessionStorage: {
    getSession: vi.fn(),
  },
}))

vi.mock("~/business/participant/apply-to-event.server", () => ({
  applyToEvent: vi.fn(),
}))

vi.mock("~/lib/analytics/umami.server", () => ({
  trackServerEvent: vi.fn(),
}))

import { applyToEvent } from "~/business/participant/apply-to-event.server"
import { rulesSessionStorage } from "~/business/session.server"
import { trackServerEvent } from "~/lib/analytics/umami.server"

const mockApplyToEvent = vi.mocked(applyToEvent)
const mockGetSession = vi.mocked(rulesSessionStorage.getSession)
const mockTrackServerEvent = vi.mocked(trackServerEvent)

const filledIn = {
  referred: "ninguém",
  bond: "Posso ir sozinhe.",
  notes: "",
  referrals: "",
  companions: "",
}

const passedQuizFor = (events?: string[]) => {
  mockGetSession.mockResolvedValue({
    get: vi.fn().mockReturnValue(events),
  } as never)
}

const submit = async (answers: unknown = filledIn) => {
  const request = new Request("http://localhost/api/events/123/application", {
    method: "POST",
    body: typeof answers === "string" ? answers : JSON.stringify(answers),
    headers: { "Content-Type": "application/json" },
  })

  const response = (await action({
    request,
    params: { id: "123" },
    context: {} as never,
  })) as Response

  return {
    response,
    body: (await response.json()) as {
      ok: boolean
      emailSent?: boolean
      message?: string
      errors?: { questionId: string; message: string }[]
    },
  }
}

describe("the event application submit", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    passedQuizFor(["123"])
    mockApplyToEvent.mockResolvedValue({
      success: true,
      data: { emailSent: true },
    } as never)
  })

  it("turns down a browser that passed no quiz", async () => {
    passedQuizFor(undefined)

    const { response, body } = await submit()

    expect(response.status).toBe(403)
    expect(body.ok).toBe(false)
    expect(mockApplyToEvent).not.toHaveBeenCalled()
  })

  it("turns down a browser that passed another event's quiz", async () => {
    passedQuizFor(["456"])

    const { response } = await submit()

    expect(response.status).toBe(403)
    expect(mockApplyToEvent).not.toHaveBeenCalled()
  })

  it("applies to the event in the url, dated by this machine", async () => {
    await submit()

    expect(mockApplyToEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "123",
        referred: "ninguém",
        bond: "Posso ir sozinhe.",
        applicationDate: expect.any(Date),
      }),
      expect.anything(),
    )
  })

  it("carries nothing the form did not ask", async () => {
    await submit({ ...filledIn, skipEmail: true, is_admin: true })

    const [payload] = mockApplyToEvent.mock.calls[0]

    expect(payload).not.toHaveProperty("skipEmail")
    expect(payload).not.toHaveProperty("is_admin")
  })

  it("names the question it turned down, with its own message", async () => {
    const { body } = await submit({ ...filledIn, referred: "" })

    expect(body.ok).toBe(false)
    expect(body.errors?.map((error) => error.questionId)).toEqual(["referred"])
    expect(mockApplyToEvent).not.toHaveBeenCalled()
  })

  it("says whether the e-mail went out", async () => {
    mockApplyToEvent.mockResolvedValue({
      success: true,
      data: { emailSent: false },
    } as never)

    const { body } = await submit()

    expect(body).toEqual({ ok: true, emailSent: false })
  })

  it("passes on the reason an application was refused", async () => {
    mockApplyToEvent.mockResolvedValue({
      success: false,
      errors: [{ message: "Inscrições encerradas" }],
    } as never)

    const { body } = await submit()

    expect(body.ok).toBe(false)
    expect(body.message).toBe("Inscrições encerradas")
  })

  it("counts an application only once it is written", async () => {
    mockApplyToEvent.mockResolvedValue({
      success: false,
      errors: [{ message: "Inscrições encerradas" }],
    } as never)
    await submit()
    expect(mockTrackServerEvent).not.toHaveBeenCalled()

    mockApplyToEvent.mockResolvedValue({
      success: true,
      data: { emailSent: true },
    } as never)
    await submit()

    expect(mockTrackServerEvent).toHaveBeenCalledWith(
      "event_application_completed",
      { eventId: "123" },
      "/events/123/apply",
    )
  })

  it("blames nobody for a body it cannot read", async () => {
    const { response, body } = await submit("not json")

    expect(response.status).toBe(400)
    expect(body).toEqual({ ok: false, errors: [] })
  })
})
