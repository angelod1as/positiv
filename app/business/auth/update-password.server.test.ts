import { beforeEach, describe, expect, it, vi } from "vitest"
import { errorsCopy } from "~/copy/errors"
import type { DBClient } from "~types/utils/utils.types"
import { updatePassword } from "./update-password.server"

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}))

const supabaseThat = (error: unknown = null) => {
  const updateUser = vi.fn().mockResolvedValue({ error })

  return {
    supabase: { auth: { updateUser } } as unknown as DBClient,
    updateUser,
  }
}

const contextWith = (supabase: DBClient) => ({
  supabase,
  supabaseHeaders: new Headers(),
  host: "http://localhost:5173/",
  currentUser: { id: "user-1", email: "pessoa@exemplo.com" },
  currentProfile: null,
})

const answers = { password: "segredo123", confirm_password: "segredo123" }

describe("updatePassword", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("writes the new password", async () => {
    const { supabase, updateUser } = supabaseThat()

    const result = await updatePassword({
      answers,
      context: contextWith(supabase) as never,
    })

    expect(updateUser).toHaveBeenCalledWith({ password: "segredo123" })
    expect(result).toEqual({ ok: true })
  })

  it("blames the confirmation when the two do not match", async () => {
    const { supabase, updateUser } = supabaseThat()

    const result = await updatePassword({
      answers: { password: "segredo123", confirm_password: "outra" },
      context: contextWith(supabase) as never,
    })

    expect(updateUser).not.toHaveBeenCalled()
    expect(result).toEqual({
      ok: false,
      errors: [
        { questionId: "confirm_password", message: "As senhas não combinam" },
      ],
    })
  })

  it("says a password already in use is why nothing changed", async () => {
    const { supabase } = supabaseThat({ code: "same_password" })

    const result = await updatePassword({
      answers,
      context: contextWith(supabase) as never,
    })

    expect(result).toEqual({
      ok: false,
      errors: [],
      message: errorsCopy.auth.samePassword,
    })
  })

  it("says the change failed for anything else, and records why", async () => {
    const { logger } = await import("~/lib/logger/logger.server")
    const { supabase } = supabaseThat({ code: "weak_password" })

    const result = await updatePassword({
      answers,
      context: contextWith(supabase) as never,
    })

    expect(result).toEqual({
      ok: false,
      errors: [],
      message: errorsCopy.auth.passwordChangeFailed,
    })
    expect(logger.error).toHaveBeenCalled()
  })
})
