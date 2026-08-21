import { beforeEach, describe, expect, it, vi } from "vitest"
import { errorsCopy } from "~/copy/errors"
import paths from "~/lib/paths"
import type { DBClient } from "~types/utils/utils.types"
import { signIn } from "./sign-in.server"

vi.mock("~/lib/analytics/umami.server", () => ({
  trackServerEvent: vi.fn(),
}))

const {
  dash: { DASHBOARD },
  admin: { ADMIN_DASHBOARD },
} = paths

type SupabaseParts = {
  signInResult?: { data: unknown; error: unknown }
  isAdmin?: boolean
}

const supabaseThat = ({
  signInResult = {
    data: { user: { id: "user-1" } },
    error: null,
  },
  isAdmin = false,
}: SupabaseParts = {}) => {
  const signInWithPassword = vi.fn().mockResolvedValue(signInResult)
  const single = vi.fn().mockResolvedValue({ data: { is_admin: isAdmin } })
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
    const { supabase } = supabaseThat({ isAdmin: true })

    const result = await signIn({ answers, context: contextWith(supabase) })

    expect(result).toEqual({ ok: true, redirectTo: ADMIN_DASHBOARD })
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

  it("records the login", async () => {
    const { trackServerEvent } = await import("~/lib/analytics/umami.server")
    const { supabase } = supabaseThat()

    await signIn({ answers, context: contextWith(supabase) })

    expect(trackServerEvent).toHaveBeenCalledWith(
      "user_login",
      { userId: "user-1" },
      "/auth/login",
    )
  })
})
