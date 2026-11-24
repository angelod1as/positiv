import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("~/business/auth/auth.server", () => ({
  getUserContext: vi.fn(),
}))

vi.mock("~/business/newsletter/email-preferences.server", () => ({
  findEmailPreferences: vi.fn(),
  saveEmailPreferences: vi.fn(),
}))

import { getUserContext } from "~/business/auth/auth.server"
import {
  findEmailPreferences,
  saveEmailPreferences,
} from "~/business/newsletter/email-preferences.server"
import { action } from "./emails"

const mockGetUserContext = vi.mocked(getUserContext)
const mockFind = vi.mocked(findEmailPreferences)
const mockSave = vi.mocked(saveEmailPreferences)

const preferences = { registrationAlerts: true, newsletter: false, marketing: true }

const run = (body: unknown) => {
  const request = new Request("http://localhost/api/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
  return action({
    request,
    url: new URL(request.url),
    pattern: "/api/emails",
    params: {},
    context: {} as never,
  })
}

const found = (profileId: string) =>
  ({
    success: true,
    data: { profileId, email: "a@example.com", preferences },
    errors: [],
  }) as never

describe("emails commit route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSave.mockResolvedValue({
      success: true,
      data: { bounced: false },
      errors: [],
    } as never)
  })

  it("saves for the profile behind the token, without a login", async () => {
    mockFind.mockResolvedValue(found("p-token"))

    const response = await run({ token: "tok", answers: preferences })

    expect(mockFind).toHaveBeenCalledWith({ token: "tok" })
    expect(mockGetUserContext).not.toHaveBeenCalled()
    expect(mockSave).toHaveBeenCalledWith("p-token", preferences)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, bounced: false })
  })

  it("saves for the person logged in when there is no token", async () => {
    mockGetUserContext.mockResolvedValue({
      currentProfile: { id: "p-session" },
      supabaseHeaders: new Headers(),
    } as never)

    await run({ answers: preferences })

    expect(mockSave).toHaveBeenCalledWith("p-session", preferences)
  })

  it("sends someone with no token and no login to the login, saving nothing", async () => {
    mockGetUserContext.mockRejectedValue(
      new Response(null, { status: 302, headers: { Location: "/entrar" } }),
    )

    await expect(run({ answers: preferences })).rejects.toBeInstanceOf(Response)
    expect(mockFind).not.toHaveBeenCalled()
    expect(mockSave).not.toHaveBeenCalled()
  })

  it("refuses a token that opens nothing", async () => {
    mockFind.mockResolvedValue({ success: true, data: null, errors: [] } as never)

    const response = await run({ token: "nope", answers: preferences })

    expect(response.status).toBe(404)
    expect(mockSave).not.toHaveBeenCalled()
  })

  it("says when the address bounced", async () => {
    mockFind.mockResolvedValue(found("p-token"))
    mockSave.mockResolvedValue({
      success: true,
      data: { bounced: true },
      errors: [],
    } as never)

    const response = await run({ token: "tok", answers: preferences })

    expect(await response.json()).toEqual({ ok: true, bounced: true })
  })

  it("answers a refusal the runtime can read when the save fails", async () => {
    mockFind.mockResolvedValue(found("p-token"))
    mockSave.mockResolvedValue({
      success: false,
      errors: [new Error("Listmonk is down")],
    } as never)

    const response = await run({ token: "tok", answers: preferences })

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ ok: false, errors: [] })
  })

  it("refuses a body it cannot read", async () => {
    const response = await run("{not json")

    expect(response.status).toBe(400)
    expect(mockSave).not.toHaveBeenCalled()
  })
})
