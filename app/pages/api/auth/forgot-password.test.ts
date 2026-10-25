import { beforeEach, describe, expect, it, vi } from "vitest"
import { action } from "./forgot-password"

vi.mock("~/business/auth/auth.server", () => ({
  getContext: vi.fn(),
}))

vi.mock("~/business/auth/request-password-reset.server", () => ({
  requestPasswordReset: vi.fn(),
}))

import { getContext } from "~/business/auth/auth.server"
import { requestPasswordReset } from "~/business/auth/request-password-reset.server"

const mockGetContext = vi.mocked(getContext)
const mockRequestPasswordReset = vi.mocked(requestPasswordReset)

const answers = { email: "pessoa@exemplo.com" }

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/auth/esqueci-senha", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })

const run = (body: unknown, headers?: Record<string, string>) => {
  const request = post(body, headers)
  return action({
    request,
    url: new URL(request.url),
    pattern: "/api/auth/esqueci-senha",
    params: {},
    context: {} as never,
  })
}

describe("forgot password commit route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetContext.mockResolvedValue({} as never)
    mockRequestPasswordReset.mockResolvedValue({ ok: true })
  })

  it("hands the answers over and answers with what came back", async () => {
    const response = await run(answers)

    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(mockRequestPasswordReset).toHaveBeenCalledWith({
      answers,
      context: expect.anything(),
      ip: null,
    })
  })

  it("refuses a body it cannot read", async () => {
    const response = await run("not json")

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ ok: false, errors: [] })
    expect(mockRequestPasswordReset).not.toHaveBeenCalled()
  })

  it("does not let a refused request read as a success", async () => {
    mockRequestPasswordReset.mockResolvedValue({
      ok: false,
      errors: [],
      message: "Não foi possível enviar",
    })

    const response = await run(answers)

    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      errors: [],
      message: "Não foi possível enviar",
    })
  })

  it("hands over the client IP the proxy saw", async () => {
    await run(answers, { "x-real-ip": "203.0.113.7" })

    expect(mockRequestPasswordReset).toHaveBeenCalledWith(
      expect.objectContaining({ ip: "203.0.113.7" }),
    )
  })

  it("answers a rate-limited request with 429", async () => {
    mockRequestPasswordReset.mockResolvedValue({
      ok: false,
      errors: [],
      message: "Muitas tentativas",
      rateLimited: true,
    })

    const response = await run(answers, { "x-real-ip": "203.0.113.7" })

    expect(response.status).toBe(429)
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      errors: [],
      message: "Muitas tentativas",
    })
  })
})
