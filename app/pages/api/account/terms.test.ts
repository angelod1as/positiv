import { beforeEach, describe, expect, it, vi } from "vitest"
import { action } from "./terms"

vi.mock("~/business/auth/auth.server", () => ({
  getUserContext: vi.fn(),
}))

vi.mock("~/business/participant/save-terms-agreement.server", () => ({
  saveTermsAgreement: vi.fn(),
}))

import { getUserContext } from "~/business/auth/auth.server"
import { saveTermsAgreement } from "~/business/participant/save-terms-agreement.server"

const mockGetUserContext = vi.mocked(getUserContext)
const mockSaveTermsAgreement = vi.mocked(saveTermsAgreement)

const answers = { agree: true, commonEmails: true, mktEmails: false }

const post = (body: unknown) =>
  new Request("http://localhost/api/account/termos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })

const run = (body: unknown) =>
  action({ request: post(body), params: {}, context: {} as never })

describe("terms commit route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUserContext.mockResolvedValue({
      supabaseHeaders: new Headers(),
    } as never)
    mockSaveTermsAgreement.mockResolvedValue({
      ok: true,
      newsletterFailed: false,
    })
  })

  it("hands the answers over and answers with what came back", async () => {
    const response = await run(answers)

    await expect(response.json()).resolves.toEqual({
      ok: true,
      newsletterFailed: false,
    })
    expect(mockSaveTermsAgreement).toHaveBeenCalledWith({
      answers,
      context: expect.anything(),
    })
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
    // here would let a bare POST agree to the terms on somebody's behalf.
    const redirect = new Response(null, {
      status: 302,
      headers: { Location: "/entrar" },
    })
    mockGetUserContext.mockRejectedValue(redirect)

    await expect(run(answers)).rejects.toBe(redirect)
    expect(mockSaveTermsAgreement).not.toHaveBeenCalled()
  })

  it("refuses a body it cannot read", async () => {
    const response = await run("not json")

    expect(response.status).toBe(400)
    expect(mockSaveTermsAgreement).not.toHaveBeenCalled()
  })

  it("does not let a refused save read as a success", async () => {
    mockSaveTermsAgreement.mockResolvedValue({
      ok: false,
      errors: [{ questionId: "agree", message: "Você precisa concordar" }],
    })

    const response = await run({ ...answers, agree: false })

    expect(response.status).toBe(422)
  })
})
