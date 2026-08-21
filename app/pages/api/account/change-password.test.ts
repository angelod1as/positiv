import { beforeEach, describe, expect, it, vi } from "vitest"
import { action } from "./change-password"

vi.mock("~/business/auth/auth.server", () => ({
  getUserContext: vi.fn(),
}))

vi.mock("~/business/auth/update-password.server", () => ({
  updatePassword: vi.fn(),
}))

import { getUserContext } from "~/business/auth/auth.server"
import { updatePassword } from "~/business/auth/update-password.server"

const mockGetUserContext = vi.mocked(getUserContext)
const mockUpdatePassword = vi.mocked(updatePassword)

const answers = { password: "segredo123", confirm_password: "segredo123" }

const post = (body: unknown) =>
  new Request("http://localhost/api/account/mudar-senha", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })

const run = (body: unknown) =>
  action({ request: post(body), params: {}, context: {} as never })

describe("change password commit route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUserContext.mockResolvedValue({
      supabaseHeaders: new Headers(),
    } as never)
    mockUpdatePassword.mockResolvedValue({ ok: true })
  })

  it("hands the answers over and answers with what came back", async () => {
    const response = await run(answers)

    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(mockUpdatePassword).toHaveBeenCalledWith({
      answers,
      context: expect.anything(),
    })
  })

  it("asks who is signed in before it writes anything", async () => {
    await run(answers)

    expect(mockGetUserContext).toHaveBeenCalled()
  })

  it("carries the cookies the session refresh wrote", async () => {
    const supabaseHeaders = new Headers()
    supabaseHeaders.append("Set-Cookie", "sb-access-token=abc; Path=/")
    mockGetUserContext.mockResolvedValue({ supabaseHeaders } as never)

    const response = await run(answers)

    expect(response.headers.get("Set-Cookie")).toContain("sb-access-token=abc")
  })

  it("lets a redirect for an anonymous caller through, rather than saving", async () => {
    // getUserContext throws a redirect when nobody is signed in. Catching it
    // here would answer a bare POST with a password change.
    const redirect = new Response(null, {
      status: 302,
      headers: { Location: "/entrar" },
    })
    mockGetUserContext.mockRejectedValue(redirect)

    await expect(run(answers)).rejects.toBe(redirect)
    expect(mockUpdatePassword).not.toHaveBeenCalled()
  })

  it("refuses a body it cannot read", async () => {
    const response = await run("not json")

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ ok: false, errors: [] })
    expect(mockUpdatePassword).not.toHaveBeenCalled()
  })

  it("does not let a refused change read as a success", async () => {
    mockUpdatePassword.mockResolvedValue({
      ok: false,
      errors: [],
      message: "Será que essa não era a sua senha? Tente outra.",
    })

    const response = await run(answers)

    expect(response.status).toBe(422)
  })
})
