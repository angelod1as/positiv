import { beforeEach, describe, expect, it, vi } from "vitest"
import { errorsCopy } from "~/copy/errors"
import type { DBClient } from "~types/utils/utils.types"
import { requestPasswordReset } from "./request-password-reset.server"

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}))

const supabaseThat = (error: unknown = null) => {
  const resetPasswordForEmail = vi.fn().mockResolvedValue({ error })

  return {
    supabase: { auth: { resetPasswordForEmail } } as unknown as DBClient,
    resetPasswordForEmail,
  }
}

const contextWith = (supabase: DBClient) => ({
  supabase,
  supabaseHeaders: new Headers(),
  host: "http://localhost:5173/",
  currentUser: null,
  currentProfile: null,
})

describe("requestPasswordReset", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("asks supabase to send the link back to the confirm page", async () => {
    const { supabase, resetPasswordForEmail } = supabaseThat()

    const result = await requestPasswordReset({
      answers: { email: "pessoa@exemplo.com" },
      context: contextWith(supabase),
    })

    expect(resetPasswordForEmail).toHaveBeenCalledWith("pessoa@exemplo.com", {
      redirectTo: "http://localhost:5173/auth/confirm",
    })
    expect(result).toEqual({ ok: true })
  })

  it("refuses an address that is not an e-mail without asking supabase", async () => {
    const { supabase, resetPasswordForEmail } = supabaseThat()

    const result = await requestPasswordReset({
      answers: { email: "nao-e-email" },
      context: contextWith(supabase),
    })

    expect(resetPasswordForEmail).not.toHaveBeenCalled()
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.map((error) => error.questionId)).toEqual(["email"])
  })

  it("says the request failed when supabase refuses it", async () => {
    const { supabase } = supabaseThat({ message: "smtp down" })

    const result = await requestPasswordReset({
      answers: { email: "pessoa@exemplo.com" },
      context: contextWith(supabase),
    })

    expect(result).toEqual({
      ok: false,
      errors: [],
      message: errorsCopy.auth.resetRequestFailed,
    })
  })

  it("records why the request failed", async () => {
    const { logger } = await import("~/lib/logger/logger.server")
    const { supabase } = supabaseThat({ message: "smtp down" })

    await requestPasswordReset({
      answers: { email: "pessoa@exemplo.com" },
      context: contextWith(supabase),
    })

    expect(logger.error).toHaveBeenCalled()
  })
})
