import { beforeEach, describe, expect, it, vi } from "vitest"
import { saveTermsAgreement } from "./save-terms-agreement.server"

vi.mock("./agree-to-terms.server", () => ({
  agreeToTerms: vi.fn(),
}))

import { agreeToTerms } from "./agree-to-terms.server"

const mockAgreeToTerms = vi.mocked(agreeToTerms)

const context = {
  supabase: {} as never,
  supabaseHeaders: new Headers(),
  host: "http://localhost:5173/",
  currentUser: { id: "user-1", email: "pessoa@exemplo.com" },
  currentProfile: null,
}

const answers = { agree: true, commonEmails: true, mktEmails: true }

const succeeded = (data: Record<string, unknown> = {}) =>
  mockAgreeToTerms.mockResolvedValue({
    success: true,
    data,
    errors: [],
  } as never)

describe("saveTermsAgreement", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    succeeded()
  })

  it("saves the choices as they were answered", async () => {
    const result = await saveTermsAgreement({ answers, context })

    expect(mockAgreeToTerms).toHaveBeenCalledWith(answers, context)
    expect(result).toEqual({ ok: true, newsletterFailed: false })
  })

  it("says the newsletter did not go through, while the choices did", async () => {
    succeeded({ newsletterSubscriptionError: "deu ruim" })

    const result = await saveTermsAgreement({ answers, context })

    expect(result).toEqual({ ok: true, newsletterFailed: true })
  })

  it("blames the box nobody ticked", async () => {
    const result = await saveTermsAgreement({
      answers: { agree: false, commonEmails: true },
      context,
    })

    expect(mockAgreeToTerms).not.toHaveBeenCalled()
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.map((error) => error.questionId)).toEqual(["agree"])
  })

  it("passes on a refusal that belongs to no box", async () => {
    mockAgreeToTerms.mockResolvedValue({
      success: false,
      data: undefined,
      errors: [{ message: "Problema ao criar perfil" }],
    } as never)

    const result = await saveTermsAgreement({ answers, context })

    expect(result).toEqual({
      ok: false,
      errors: [],
      message: "Problema ao criar perfil",
    })
  })
})
