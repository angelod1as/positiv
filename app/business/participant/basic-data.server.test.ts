import type { SupabaseClient } from "@supabase/supabase-js"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { z } from "zod"
import type { Database } from "~/types/database/database.types"
import type { userContextSchema } from "../common"
import { saveBasicData } from "./basic-data.server"

const subscribe = vi.hoisted(() => vi.fn())
const selectFrom = vi.hoisted(() => vi.fn())

vi.mock("../newsletter/auto-subscribe.server", () => ({
  subscribeProfileToNewsletter: subscribe,
}))

vi.mock("~/lib/supabase/db.server", () => ({
  db: { selectFrom },
}))

const answers = {
  full_name: "Test User",
  social_name: "Test",
  date_of_birth: "1990-01-01",
  where_lives: "São Paulo",
  how_came_to_us: "Friend",
  phone: "11999999999",
  confirm_phone: "11999999999",
  cpf: "12345678901",
  rg: "123456789",
  rg_issuer: "SSP/SP",
  gender: ["Travesti"],
  orientation: ["Bi"],
  pronouns: ["Ela/dela"],
  race_color: ["Preta"],
}

type Orphan = { id: string } | null

const mockSupabase = (orphan: Orphan = null, savedId = "profile-1") => {
  const single = vi.fn().mockResolvedValue({ data: orphan, error: null })
  const is = vi.fn().mockReturnValue({ single })
  const eq = vi.fn().mockReturnValue({ is })
  const select = vi.fn().mockReturnValue({ eq })

  const upsertSingle = vi
    .fn()
    .mockResolvedValue({ data: { id: savedId }, error: null })
  const upsertSelect = vi.fn().mockReturnValue({ single: upsertSingle })
  const upsert = vi.fn().mockReturnValue({ select: upsertSelect })

  const from = vi.fn().mockReturnValue({ select, upsert })

  return { from, select, eq, is, single, upsert }
}

const contextWith = (supabase: {
  from: ReturnType<typeof vi.fn>
}): z.infer<typeof userContextSchema> => ({
  supabase: supabase as unknown as SupabaseClient<Database>,
  currentProfile: null,
  currentUser: { id: "user-123", email: "test@example.com" },
  supabaseHeaders: new Headers(),
  host: "localhost",
})

const noSubscription = () => ({
  select: () => ({
    where: () => ({
      where: () => ({ executeTakeFirst: vi.fn().mockResolvedValue(undefined) }),
    }),
  }),
})

describe("saveBasicData", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectFrom.mockReturnValue(noSubscription())
  })

  it("saves what was answered", async () => {
    const supabase = mockSupabase()

    const result = await saveBasicData({
      answers,
      context: contextWith(supabase),
    })

    expect(result).toEqual({ ok: true })
    expect(supabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        email: "test@example.com",
        full_name: "Test User",
        date_of_birth: "1990-01-01T00:00:00.000Z",
        gender: ["Travesti"],
        race_color: ["Preta"],
        basic_data_filled: true,
      }),
      { onConflict: "user_id" },
    )
  })

  it("does not write the confirmation of the phone to the profile", async () => {
    const supabase = mockSupabase()

    await saveBasicData({ answers, context: contextWith(supabase) })

    expect(supabase.upsert).toHaveBeenCalledWith(
      expect.not.objectContaining({ confirm_phone: expect.anything() }),
      expect.anything(),
    )
  })

  it("adopts a profile left behind with the same e-mail", async () => {
    const supabase = mockSupabase({ id: "orphaned-123" })

    await saveBasicData({ answers, context: contextWith(supabase) })

    expect(supabase.eq).toHaveBeenCalledWith("email", "test@example.com")
    expect(supabase.is).toHaveBeenCalledWith("user_id", null)
    expect(supabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "orphaned-123", user_id: "user-123" }),
      { onConflict: "user_id" },
    )
  })

  it("keeps going when the orphan lookup finds nothing", async () => {
    const supabase = mockSupabase()
    supabase.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "no rows" },
    })

    const result = await saveBasicData({
      answers,
      context: contextWith(supabase),
    })

    expect(result).toEqual({ ok: true })
  })

  it("refuses to guess when the orphan lookup itself failed", async () => {
    const supabase = mockSupabase()
    supabase.single.mockResolvedValue({
      data: null,
      error: { code: "08006", message: "connection failure" },
    })

    await expect(
      saveBasicData({ answers, context: contextWith(supabase) }),
    ).rejects.toThrow()
    expect(supabase.upsert).not.toHaveBeenCalled()
  })

  it("names the question behind each rejected field", async () => {
    const supabase = mockSupabase()

    const result = await saveBasicData({
      answers: { ...answers, cpf: "", gender: [] },
      context: contextWith(supabase),
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error("expected a refusal")

    expect(result.errors.map((error) => error.questionId)).toEqual(
      expect.arrayContaining(["cpf", "gender"]),
    )
    expect(supabase.upsert).not.toHaveBeenCalled()
  })

  it("blames the confirmation, not the phone, when the two disagree", async () => {
    const supabase = mockSupabase()

    const result = await saveBasicData({
      answers: { ...answers, confirm_phone: "11888888888" },
      context: contextWith(supabase),
    })

    if (result.ok) throw new Error("expected a refusal")
    expect(result.errors[0].questionId).toBe("confirm_phone")
  })

  it("re-syncs the newsletter once there is a real name to sync", async () => {
    const supabase = mockSupabase(null, "profile-9")
    selectFrom.mockReturnValue({
      select: () => ({
        where: () => ({
          where: () => ({
            executeTakeFirst: vi.fn().mockResolvedValue({
              consent_given: true,
              subscription_source: "terms_and_conditions",
            }),
          }),
        }),
      }),
    })

    await saveBasicData({ answers, context: contextWith(supabase) })

    expect(subscribe).toHaveBeenCalledWith("profile-9", "terms_and_conditions")
  })

  it("leaves the newsletter alone when nobody consented", async () => {
    const supabase = mockSupabase()

    await saveBasicData({ answers, context: contextWith(supabase) })

    expect(subscribe).not.toHaveBeenCalled()
  })
})
