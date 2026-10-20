import { ENV } from "varlock/env"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { errorsCopy } from "~/copy/errors"
import type { DBClient } from "~types/utils/utils.types"
import { recordAuthAttempt } from "./auth-attempt-guard.server"
import { requestPasswordReset } from "./request-password-reset.server"

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))

vi.mock("varlock/env", () => ({
  ENV: {},
}))

vi.mock("./auth-attempt-guard.server", () => ({
  recordAuthAttempt: vi.fn(),
}))

const CLIENT_IP = "203.0.113.7"

const supabaseThat = (error: unknown = null) => {
  const resetPasswordForEmail = vi.fn().mockResolvedValue({ error })

  return {
    supabase: { auth: { resetPasswordForEmail } } as unknown as DBClient,
    resetPasswordForEmail,
  }
}

const contextWith = (supabase: DBClient, host = "localhost:5173") => ({
  supabase,
  supabaseHeaders: new Headers(),
  host,
  currentUser: null,
  currentProfile: null,
})

describe("requestPasswordReset", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(recordAuthAttempt).mockResolvedValue(true)
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

  it("sends a deployed host back to its own confirm page, over https", async () => {
    const { supabase, resetPasswordForEmail } = supabaseThat()

    await requestPasswordReset({
      answers: { email: "pessoa@exemplo.com" },
      context: contextWith(supabase, "positiv.com.br"),
    })

    expect(resetPasswordForEmail).toHaveBeenCalledWith("pessoa@exemplo.com", {
      redirectTo: "https://positiv.com.br/auth/confirm",
    })
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

  it("answers as if sent when supabase holds back a repeat e-mail", async () => {
    const { supabase } = supabaseThat({
      code: "over_email_send_rate_limit",
      message: "For security purposes, you can only request this after 60 seconds.",
    })

    const result = await requestPasswordReset({
      answers: { email: "pessoa@exemplo.com" },
      context: contextWith(supabase),
    })

    expect(result).toEqual({ ok: true })
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

  describe("attempt limits", () => {
    const runningIn = (env: string | undefined) => {
      ;(ENV as { APP_ENV?: string }).APP_ENV = env
    }

    afterEach(() => runningIn(undefined))

    const limited = {
      ok: false,
      errors: [],
      message: errorsCopy.auth.resetRateLimited,
      rateLimited: true,
    }

    const limitScope = (scope: string) =>
      vi
        .mocked(recordAuthAttempt)
        .mockImplementation(async (asked) => asked !== scope)

    it("counts the request against the address and the e-mail", async () => {
      const { supabase } = supabaseThat()

      await requestPasswordReset({
        answers: { email: "pessoa@exemplo.com" },
        context: contextWith(supabase),
        ip: CLIENT_IP,
      })

      expect(recordAuthAttempt).toHaveBeenCalledWith("reset_ip", CLIENT_IP)
      expect(recordAuthAttempt).toHaveBeenCalledWith(
        "reset_email",
        "pessoa@exemplo.com",
      )
    })

    it.each(["reset_ip", "reset_email"])(
      "refuses a request over the %s limit without asking supabase",
      async (scope) => {
        limitScope(scope)
        const { supabase, resetPasswordForEmail } = supabaseThat()

        const result = await requestPasswordReset({
          answers: { email: "pessoa@exemplo.com" },
          context: contextWith(supabase),
          ip: CLIENT_IP,
        })

        expect(resetPasswordForEmail).not.toHaveBeenCalled()
        expect(result).toEqual(limited)
      },
    )

    it("counts the address even when the e-mail is what refuses the request", async () => {
      limitScope("reset_email")
      const { supabase } = supabaseThat()

      await requestPasswordReset({
        answers: { email: "pessoa@exemplo.com" },
        context: contextWith(supabase),
        ip: CLIENT_IP,
      })

      expect(recordAuthAttempt).toHaveBeenCalledWith("reset_ip", CLIENT_IP)
    })

    it("answers a limited e-mail the same whether or not it has an account", async () => {
      limitScope("reset_email")
      const known = supabaseThat()
      const unknown = supabaseThat({ message: "user not found" })

      const knownResult = await requestPasswordReset({
        answers: { email: "pessoa@exemplo.com" },
        context: contextWith(known.supabase),
        ip: CLIENT_IP,
      })
      const unknownResult = await requestPasswordReset({
        answers: { email: "ninguem@exemplo.com" },
        context: contextWith(unknown.supabase),
        ip: CLIENT_IP,
      })

      expect(unknownResult).toEqual(knownResult)
    })

    it("leaves the address limit out when no address is known", async () => {
      const { supabase } = supabaseThat()

      const result = await requestPasswordReset({
        answers: { email: "pessoa@exemplo.com" },
        context: contextWith(supabase),
        ip: null,
      })

      expect(recordAuthAttempt).not.toHaveBeenCalledWith(
        "reset_ip",
        expect.anything(),
      )
      expect(recordAuthAttempt).toHaveBeenCalledWith(
        "reset_email",
        "pessoa@exemplo.com",
      )
      expect(result).toEqual({ ok: true })
    })

    it("logs a missing address in production, where the proxy always sets one", async () => {
      runningIn("production")
      const { logger } = await import("~/lib/logger/logger.server")
      const { supabase } = supabaseThat()

      await requestPasswordReset({
        answers: { email: "pessoa@exemplo.com" },
        context: contextWith(supabase),
        ip: null,
      })

      expect(logger.error).toHaveBeenCalled()
    })
  })
})
