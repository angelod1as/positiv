import { ENV } from "varlock/env"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { errorsCopy } from "~/copy/errors"
import { logger } from "~/lib/logger/logger.server"
import paths from "~/lib/paths"
import type { DBClient } from "~types/utils/utils.types"
import {
  recordAuthAttempt,
  releaseAuthAttempt,
  reserveAuthAttempt,
} from "./auth-attempt-guard.server"
import { signIn } from "./sign-in.server"

vi.mock("varlock/env", () => ({
  ENV: {},
}))

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}))

vi.mock("./auth-attempt-guard.server", () => ({
  recordAuthAttempt: vi.fn(),
  reserveAuthAttempt: vi.fn(),
  releaseAuthAttempt: vi.fn(),
}))

const RESERVATION_ID = 42

const CLIENT_IP = "203.0.113.7"

const {
  dash: { DASHBOARD },
  admin: { ADMIN_DASHBOARD },
} = paths

type SupabaseParts = {
  signInResult?: { data: unknown; error: unknown }
  permissions?: string[]
}

const supabaseThat = ({
  signInResult = {
    data: { user: { id: "user-1" } },
    error: null,
  },
  permissions = [],
}: SupabaseParts = {}) => {
  const signInWithPassword = vi.fn().mockResolvedValue(signInResult)
  const single = vi.fn().mockResolvedValue({
    data: { permissions },
  })
  const rpc = vi.fn().mockReturnValue({ single })

  return {
    supabase: {
      auth: { signInWithPassword },
      rpc,
    } as unknown as DBClient,
    signInWithPassword,
    rpc,
  }
}

const contextWith = (supabase: DBClient) => ({
  supabase,
  supabaseHeaders: new Headers(),
  host: "http://localhost:5173/",
  currentUser: null,
  currentProfile: null,
})

const answers = { email: "pessoa@exemplo.com", password: "segredo123" }

describe("signIn", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(recordAuthAttempt).mockResolvedValue(true)
    vi.mocked(reserveAuthAttempt).mockResolvedValue(RESERVATION_ID)
    vi.mocked(releaseAuthAttempt).mockResolvedValue(undefined)
  })

  it("signs in with the answers given", async () => {
    const { supabase, signInWithPassword } = supabaseThat()

    await signIn({ answers, context: contextWith(supabase) })

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "pessoa@exemplo.com",
      password: "segredo123",
    })
  })

  it("sends someone to their dashboard", async () => {
    const { supabase } = supabaseThat()

    const result = await signIn({ answers, context: contextWith(supabase) })

    expect(result).toEqual({ ok: true, redirectTo: DASHBOARD })
  })

  it("sends an admin to the admin dashboard", async () => {
    const { supabase } = supabaseThat({
      permissions: ["admin.panel", "events.apply_direct"],
    })

    const result = await signIn({ answers, context: contextWith(supabase) })

    expect(result).toEqual({ ok: true, redirectTo: ADMIN_DASHBOARD })
  })

  it("sends a staff to their dashboard", async () => {
    const { supabase } = supabaseThat({ permissions: ["events.apply_direct"] })

    const result = await signIn({ answers, context: contextWith(supabase) })

    expect(result).toEqual({ ok: true, redirectTo: DASHBOARD })
  })

  it("sends the person where they were going", async () => {
    const { supabase } = supabaseThat()

    const result = await signIn({
      answers: { ...answers, redirectTo: "/convite/abc" },
      context: contextWith(supabase),
    })

    expect(result).toEqual({ ok: true, redirectTo: "/convite/abc" })
  })

  it("ignores a redirect that points off-site", async () => {
    const { supabase } = supabaseThat()

    const result = await signIn({
      answers: { ...answers, redirectTo: "https://evil.example" },
      context: contextWith(supabase),
    })

    expect(result).toEqual({ ok: true, redirectTo: DASHBOARD })
  })

  it("says the credentials were refused without blaming a field", async () => {
    const { supabase } = supabaseThat({
      signInResult: { data: null, error: { code: "invalid_credentials" } },
    })

    const result = await signIn({ answers, context: contextWith(supabase) })

    expect(result).toEqual({
      ok: false,
      errors: [],
      message: errorsCopy.auth.invalidCredentials,
    })
  })

  it("says an unconfirmed e-mail is why the sign-in failed", async () => {
    const { supabase } = supabaseThat({
      signInResult: { data: null, error: { code: "email_not_confirmed" } },
    })

    const result = await signIn({ answers, context: contextWith(supabase) })

    expect(result).toEqual({
      ok: false,
      errors: [],
      message: errorsCopy.auth.emailNotConfirmed,
    })
  })

  it("passes on a failure it has no words of its own for", async () => {
    const { supabase } = supabaseThat({
      signInResult: {
        data: null,
        error: { code: "over_request_rate_limit", message: "slow down" },
      },
    })

    const result = await signIn({ answers, context: contextWith(supabase) })

    expect(result).toEqual({
      ok: false,
      errors: [],
      message: errorsCopy.auth.authFailed("over_request_rate_limit", "slow down"),
    })
  })

  it("refuses answers the schema rejects without asking supabase", async () => {
    const { supabase, signInWithPassword } = supabaseThat()

    const result = await signIn({
      answers: { email: "nao-e-email", password: "" },
      context: contextWith(supabase),
    })

    expect(signInWithPassword).not.toHaveBeenCalled()
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.map((error) => error.questionId)).toEqual([
      "email",
      "password",
    ])
  })

  describe("attempt limits", () => {
    const runningIn = (env: string | undefined) => {
      ;(ENV as { APP_ENV?: string }).APP_ENV = env
    }

    afterEach(() => runningIn(undefined))

    const limited = {
      ok: false,
      errors: [],
      message: errorsCopy.auth.loginRateLimited,
      rateLimited: true,
    }

    it("counts the attempt against the address it came from", async () => {
      const { supabase } = supabaseThat()

      await signIn({ answers, context: contextWith(supabase), ip: CLIENT_IP })

      expect(recordAuthAttempt).toHaveBeenCalledWith("login_ip", CLIENT_IP)
    })

    it("refuses an address over its limit without asking supabase", async () => {
      vi.mocked(recordAuthAttempt).mockResolvedValue(false)
      const { supabase, signInWithPassword } = supabaseThat()

      const result = await signIn({
        answers,
        context: contextWith(supabase),
        ip: CLIENT_IP,
      })

      expect(signInWithPassword).not.toHaveBeenCalled()
      expect(result).toEqual(limited)
    })

    it("refuses an e-mail over its failure limit without asking supabase", async () => {
      vi.mocked(reserveAuthAttempt).mockResolvedValue(null)
      const { supabase, signInWithPassword } = supabaseThat()

      const result = await signIn({
        answers,
        context: contextWith(supabase),
        ip: CLIENT_IP,
      })

      expect(reserveAuthAttempt).toHaveBeenCalledWith(
        "login_email",
        "pessoa@exemplo.com",
      )
      expect(signInWithPassword).not.toHaveBeenCalled()
      expect(result).toEqual(limited)
    })

    it("answers a limited e-mail the same whether or not it has an account", async () => {
      vi.mocked(reserveAuthAttempt).mockResolvedValue(null)
      const known = supabaseThat()
      const unknown = supabaseThat({
        signInResult: { data: null, error: { code: "invalid_credentials" } },
      })

      const knownResult = await signIn({
        answers,
        context: contextWith(known.supabase),
        ip: CLIENT_IP,
      })
      const unknownResult = await signIn({
        answers: { ...answers, email: "ninguem@exemplo.com" },
        context: contextWith(unknown.supabase),
        ip: CLIENT_IP,
      })

      expect(unknownResult).toEqual(knownResult)
    })

    it("keeps a refused password counted against the e-mail", async () => {
      const { supabase } = supabaseThat({
        signInResult: { data: null, error: { code: "invalid_credentials" } },
      })

      await signIn({ answers, context: contextWith(supabase), ip: CLIENT_IP })

      expect(releaseAuthAttempt).not.toHaveBeenCalled()
    })

    it("gives the e-mail its turn back after a sign-in that went through", async () => {
      const { supabase } = supabaseThat()

      await signIn({ answers, context: contextWith(supabase), ip: CLIENT_IP })

      expect(releaseAuthAttempt).toHaveBeenCalledWith(RESERVATION_ID)
    })

    it.each(["email_not_confirmed", "over_request_rate_limit"])(
      "gives the e-mail its turn back when supabase answers %s",
      async (code) => {
        const { supabase } = supabaseThat({
          signInResult: { data: null, error: { code, message: "" } },
        })

        await signIn({ answers, context: contextWith(supabase), ip: CLIENT_IP })

        expect(releaseAuthAttempt).toHaveBeenCalledWith(RESERVATION_ID)
      },
    )

    it("gives the e-mail its turn back when supabase throws", async () => {
      const { supabase, signInWithPassword } = supabaseThat()
      signInWithPassword.mockRejectedValueOnce(new Error("network down"))

      await expect(
        signIn({ answers, context: contextWith(supabase), ip: CLIENT_IP }),
      ).rejects.toThrow("network down")

      expect(releaseAuthAttempt).toHaveBeenCalledWith(RESERVATION_ID)
    })

    it("still signs in when the turn cannot be handed back", async () => {
      vi.mocked(releaseAuthAttempt).mockRejectedValueOnce(new Error("db down"))
      const { supabase } = supabaseThat()

      const result = await signIn({
        answers,
        context: contextWith(supabase),
        ip: CLIENT_IP,
      })

      expect(result).toEqual({ ok: true, redirectTo: DASHBOARD })
      expect(logger.error).toHaveBeenCalled()
    })

    it("leaves the address limit out when no address is known", async () => {
      const { supabase } = supabaseThat()

      const result = await signIn({
        answers,
        context: contextWith(supabase),
        ip: null,
      })

      expect(recordAuthAttempt).not.toHaveBeenCalled()
      expect(reserveAuthAttempt).toHaveBeenCalled()
      expect(result.ok).toBe(true)
    })

    it("logs a missing address in production, where the proxy always sets one", async () => {
      runningIn("production")
      const { supabase } = supabaseThat()

      await signIn({ answers, context: contextWith(supabase), ip: null })

      expect(logger.error).toHaveBeenCalled()
    })
  })
})
