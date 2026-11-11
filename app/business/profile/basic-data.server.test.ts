import { beforeEach, describe, expect, it, vi } from "vitest"
import type { z } from "zod"
import { cpfExemptionCopy } from "~/copy/account"
import { participantCopy } from "~/copy/participant"
import { logger } from "~/lib/logger/logger.server"
import type { userContextSchema } from "../auth/auth-schemas"
import { saveBasicData } from "./basic-data.server"

const subscribe = vi.hoisted(() => vi.fn())
const refresh = vi.hoisted(() => vi.fn())
const fake = vi.hoisted(() => ({
  orphan: undefined as { id: string } | undefined,
  saved: { id: "profile-1" } as { id: string } | undefined,
  subscription: undefined as
    | { consent_given: boolean; subscription_source: string }
    | undefined,
  failWith: undefined as unknown,
  lookupFailsWith: undefined as unknown,
  calls: [] as { table: string; method: string; args: unknown[] }[],
}))

vi.mock("../newsletter/auto-subscribe.server", () => ({
  subscribeProfileToNewsletter: subscribe,
  refreshNewsletterSubscriber: refresh,
}))

// Every builder method records itself and hands the chain back; the terminal
// call answers with what the test set up for that table.
vi.mock("~/lib/supabase/db.server", () => {
  const chain = (table: string, kind: string): unknown =>
    new Proxy(
      {},
      {
        get(_, method: string) {
          if (method === "executeTakeFirst") {
            return async () => {
              if (fake.failWith && kind !== "select") throw fake.failWith
              if (fake.lookupFailsWith && table === "profiles") {
                throw fake.lookupFailsWith
              }
              if (kind !== "select") return fake.saved
              return table === "profiles" ? fake.orphan : fake.subscription
            }
          }
          return (...args: unknown[]) => {
            fake.calls.push({ table, method, args })
            return chain(table, kind)
          }
        },
      },
    )

  return {
    db: {
      selectFrom: (table: string) => chain(table, "select"),
      updateTable: (table: string) => chain(table, "update"),
      insertInto: (table: string) => chain(table, "insert"),
    },
  }
})

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { error: vi.fn() },
}))

const answers = {
  full_name: "Test User",
  social_name: "Test",
  date_of_birth: "1990-01-01",
  where_lives: "São Paulo",
  how_came_to_us: "Friend",
  phone: "11999999999",
  confirm_phone: "11999999999",
  cpf: "52998224725",
  rg: "123456789",
  rg_issuer: "SSP/SP",
  gender: ["Travesti"],
  orientation: ["Bi"],
  pronouns: ["Ela/dela"],
  race_color: ["Preta"],
}

const context = (): z.infer<typeof userContextSchema> => ({
  supabase: {} as never,
  currentProfile: null,
  currentUser: { id: "user-123", email: "test@example.com" },
  supabaseHeaders: new Headers(),
  host: "localhost",
})

const called = (method: string) =>
  fake.calls.filter((call) => call.method === method)
const written = (method: "set" | "values") => called(method)[0]?.args[0]

describe("saveBasicData", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fake.orphan = undefined
    fake.saved = { id: "profile-1" }
    fake.subscription = undefined
    fake.failWith = undefined
    fake.lookupFailsWith = undefined
    fake.calls = []
  })

  it("saves what was answered", async () => {
    const result = await saveBasicData({ answers, context: context() })

    expect(result).toEqual({ ok: true })
    expect(written("values")).toEqual(
      expect.objectContaining({
        user_id: "user-123",
        email: "test@example.com",
        full_name: "Test User",
        date_of_birth: "1990-01-01T00:00:00.000Z",
        gender: ["Travesti"],
        race_color: ["Preta"],
        basic_data_filled: true,
      }),
    )
  })

  it("does not write the confirmation of the phone to the profile", async () => {
    await saveBasicData({ answers, context: context() })

    expect(written("values")).toEqual(
      expect.not.objectContaining({ confirm_phone: expect.anything() }),
    )
  })

  describe("without a CPF", () => {
    const signedInAs = (cpfExempt: boolean) => ({
      ...context(),
      currentProfile: {
        id: "profile-1",
        basic_data_filled: false,
        created_at: "2026-11-06T00:00:00Z",
        cpf_exempt: cpfExempt,
      },
    })

    it("saves an exempt profile with no CPF, whatever the form sent", async () => {
      const result = await saveBasicData({
        answers: { ...answers, cpf: "52998224725" },
        context: signedInAs(true),
      })

      expect(result).toEqual({ ok: true })
      expect(written("set")).toEqual(
        expect.objectContaining({ cpf: null, rg: "123456789" }),
      )
    })

    it("refuses a missing CPF until an admin grants the exemption", async () => {
      const result = await saveBasicData({
        answers: { ...answers, cpf: "", cpf_exempt_requested: true },
        context: signedInAs(false),
      })

      expect(result).toEqual({
        ok: false,
        errors: [{ questionId: "cpf", message: cpfExemptionCopy.notYetExempt }],
      })
      expect(called("set")).toHaveLength(0)
    })

    it("does not take the form's word for an exemption", async () => {
      const result = await saveBasicData({
        answers: { ...answers, cpf: "", cpf_exempt: true },
        context: signedInAs(false),
      })

      expect(result.ok).toBe(false)
      expect(called("set")).toHaveLength(0)
    })

    it("saves a CPF typed in after asking for an exemption", async () => {
      const result = await saveBasicData({
        answers: { ...answers, cpf_exempt_requested: true },
        context: signedInAs(false),
      })

      expect(result).toEqual({ ok: true })
      expect(written("set")).toEqual(
        expect.objectContaining({ cpf: "52998224725" }),
      )
    })
  })

  it("adopts a profile left behind with the same e-mail", async () => {
    fake.orphan = { id: "orphaned-123" }

    await saveBasicData({ answers, context: context() })

    // Updated by its own id rather than inserted: a profile left behind has no
    // user_id to conflict on, so an insert would collide on the e-mail.
    expect(written("set")).toEqual(
      expect.objectContaining({ user_id: "user-123" }),
    )
    expect(called("where")).toContainEqual(
      expect.objectContaining({
        table: "profiles",
        args: ["id", "=", "orphaned-123"],
      }),
    )
    expect(called("values")).toHaveLength(0)
  })

  it("refuses when the profile to write is not this person's", async () => {
    fake.orphan = { id: "someone-else" }
    fake.saved = undefined

    const result = await saveBasicData({ answers, context: context() })

    expect(result).toEqual({ ok: false, errors: [] })
    expect(refresh).not.toHaveBeenCalled()
  })

  it("refuses to guess when the orphan lookup itself failed", async () => {
    fake.lookupFailsWith = { code: "08006", message: "connection failure" }

    const result = await saveBasicData({ answers, context: context() })

    expect(result).toEqual({ ok: false, errors: [] })
    expect(called("values")).toHaveLength(0)
    expect(called("set")).toHaveLength(0)
  })

  it("refuses rather than throws when the write itself failed", async () => {
    fake.failWith = { code: "23505", message: "duplicate key" }

    const result = await saveBasicData({ answers, context: context() })

    expect(result).toEqual({ ok: false, errors: [] })
    expect(logger.error).toHaveBeenCalledWith(
      participantCopy.basicData.profileUpdateFailed("23505", "duplicate key"),
    )
  })

  it("names the question behind each rejected field", async () => {
    const result = await saveBasicData({
      answers: { ...answers, cpf: "", gender: [] },
      context: context(),
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error("expected a refusal")

    expect(result.errors.map((error) => error.questionId)).toEqual(
      expect.arrayContaining(["cpf", "gender"]),
    )
    expect(called("values")).toHaveLength(0)
  })

  it("blames the confirmation, not the phone, when the two disagree", async () => {
    const result = await saveBasicData({
      answers: { ...answers, confirm_phone: "11888888888" },
      context: context(),
    })

    if (result.ok) throw new Error("expected a refusal")
    expect(result.errors[0].questionId).toBe("confirm_phone")
  })

  it("refreshes the subscriber's name without resubscribing", async () => {
    fake.saved = { id: "profile-9" }
    fake.subscription = {
      consent_given: true,
      subscription_source: "terms_and_conditions",
    }

    await saveBasicData({ answers, context: context() })

    expect(refresh).toHaveBeenCalledWith("profile-9")
    expect(subscribe).not.toHaveBeenCalled()
  })

  it("leaves the newsletter alone when nobody consented", async () => {
    await saveBasicData({ answers, context: context() })

    expect(subscribe).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
  })
})
