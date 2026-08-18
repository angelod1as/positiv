import { beforeEach, describe, expect, it, vi } from "vitest"
import { action } from "./register"

vi.mock("~/business/auth/auth.server", () => ({
  getContext: vi.fn(),
  registerUser: vi.fn(),
}))

import { getContext, registerUser } from "~/business/auth/auth.server"

const mockGetContext = vi.mocked(getContext)
const mockRegisterUser = vi.mocked(registerUser)

const valid = {
  email: "pessoa@exemplo.com",
  password: "segredo123",
  confirmPassword: "segredo123",
  over18: true,
  captchaToken: "token",
}

const post = (body: unknown) =>
  new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })

const run = (body: unknown) =>
  action({ request: post(body), params: {}, context: {} as never })

describe("register commit route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetContext.mockResolvedValue({} as never)
    mockRegisterUser.mockResolvedValue({ ok: true })
  })

  it("passes a valid body through and answers with what registerUser said", async () => {
    const response = await run(valid)

    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(mockRegisterUser).toHaveBeenCalledWith(valid, expect.anything())
  })

  it("returns the zod issues keyed by question, without reaching registerUser", async () => {
    const response = await run({ ...valid, confirmPassword: "outra" })

    await expect(response.json()).resolves.toEqual({
      ok: false,
      errors: [
        { questionId: "confirmPassword", message: "As senhas não são iguais" },
      ],
    })
    expect(mockRegisterUser).not.toHaveBeenCalled()
  })

  it("refuses a bare post with nothing filled in", async () => {
    const response = await run({})

    const body = (await response.json()) as {
      ok: boolean
      errors: { questionId: string }[]
    }

    expect(body.ok).toBe(false)
    expect(body.errors.map((error) => error.questionId).sort()).toEqual([
      "captchaToken",
      "confirmPassword",
      "email",
      "over18",
      "password",
    ])
    expect(mockRegisterUser).not.toHaveBeenCalled()
  })

  it("blames no question for a body it cannot read", async () => {
    const response = await run("not json")

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ ok: false, errors: [] })
    expect(mockRegisterUser).not.toHaveBeenCalled()
  })

  it("hands a rejection from registerUser straight back", async () => {
    mockRegisterUser.mockResolvedValue({
      ok: false,
      errors: [{ questionId: "email", message: "Houve um erro no cadastro." }],
    })

    const response = await run(valid)

    await expect(response.json()).resolves.toEqual({
      ok: false,
      errors: [{ questionId: "email", message: "Houve um erro no cadastro." }],
    })
  })
})
