import { beforeEach, describe, expect, it, vi } from "vitest"
import { action } from "./login"

vi.mock("~/business/auth/auth.server", () => ({
  getContext: vi.fn(),
}))

vi.mock("~/business/auth/sign-in.server", () => ({
  signIn: vi.fn(),
}))

import { getContext } from "~/business/auth/auth.server"
import { signIn } from "~/business/auth/sign-in.server"

const mockGetContext = vi.mocked(getContext)
const mockSignIn = vi.mocked(signIn)

const answers = { email: "pessoa@exemplo.com", password: "segredo123" }

const post = (body: unknown) =>
  new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })

const run = (body: unknown) =>
  action({ request: post(body), params: {}, context: {} as never })

describe("login commit route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetContext.mockResolvedValue({ supabaseHeaders: new Headers() } as never)
    mockSignIn.mockResolvedValue({ ok: true, redirectTo: "/dashboard" })
  })

  it("answers with where the sign-in says the person belongs", async () => {
    const response = await run(answers)

    await expect(response.json()).resolves.toEqual({
      ok: true,
      redirectTo: "/dashboard",
    })
    expect(mockSignIn).toHaveBeenCalledWith({
      answers,
      context: expect.anything(),
    })
  })

  it("carries the session cookies the sign-in wrote", async () => {
    const supabaseHeaders = new Headers()
    supabaseHeaders.append("Set-Cookie", "sb-access-token=abc; Path=/")
    mockGetContext.mockResolvedValue({ supabaseHeaders } as never)

    const response = await run(answers)

    expect(response.headers.get("Set-Cookie")).toContain("sb-access-token=abc")
  })

  it("refuses a body it cannot read", async () => {
    const response = await run("not json")

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ ok: false, errors: [] })
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it("does not let a refused sign-in read as a success", async () => {
    mockSignIn.mockResolvedValue({
      ok: false,
      errors: [],
      message: "Credenciais inválidas",
    })

    const response = await run(answers)

    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      errors: [],
      message: "Credenciais inválidas",
    })
  })
})
