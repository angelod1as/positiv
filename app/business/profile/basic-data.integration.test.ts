import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createTestAuthUser, createTestProfile } from "~/test/db-test-utils"
import { cleanupAfterTest, setupIntegrationTest } from "~/test/integration-setup"
import { logger } from "~/lib/logger/logger.server"
import { basicDataValidation } from "~/copy/account"
import * as listmonkClient from "../newsletter/listmonk-client.server"
import { subscribeProfileToNewsletter } from "../newsletter/auto-subscribe.server"
import { saveBasicData } from "./basic-data.server"

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const answersFor = (email: string) => ({
  full_name: "Maria Silva",
  social_name: "Mari",
  date_of_birth: "1990-01-01",
  where_lives: "São Paulo",
  how_came_to_us: "Uma amiga",
  phone: "11999999999",
  confirm_phone: "11999999999",
  cpf: "52998224725",
  rg: "123456789",
  rg_issuer: "SSP/SP",
  gender: ["Travesti"],
  orientation: ["Bi"],
  pronouns: ["Ela/dela"],
  race_color: ["Preta"],
  email,
})

// The save goes through Kysely alone. A session client that throws on use
// proves it, and keeps the service_role -- which would mask any missing check
// -- out of these tests.
const noSupabase = new Proxy(
  {},
  {
    get() {
      throw new Error("saveBasicData must not reach supabase-js")
    },
  },
)

describe("saveBasicData - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(() => {
    tracker.clear()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
    vi.restoreAllMocks()
  })

  const contextFor = (email: string, userId: string) => ({
    supabase: noSupabase,
    supabaseHeaders: new Headers(),
    currentUser: { id: userId, email },
    currentProfile: null,
    isProdInDev: false,
    host: null,
  })

  it("adopts the profile waiting under the same e-mail instead of writing a second one", async () => {
    const email = "test-orphan-adoption@example.com"
    const userId = await createTestAuthUser(email, "test1234", tracker)

    const orphan = await createTestProfile(tracker, kysely, {
      email,
      user_id: null,
      full_name: null,
      is_veteran: true,
      approved_to_attend: "approved",
    })

    const result = await saveBasicData({
      answers: answersFor(email),
      // The context is what the route hands over; the cast keeps this test to
      // the save itself rather than to the shape of an authenticated request.
      context: contextFor(email, userId) as never,
    })

    expect(result).toEqual({ ok: true })

    const rows = await kysely
      .selectFrom("profiles")
      .selectAll()
      .where("email", "=", email)
      .execute()

    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(orphan.id)
    expect(rows[0].user_id).toBe(userId)
    expect(rows[0].full_name).toBe("Maria Silva")
    expect(rows[0].basic_data_filled).toBe(true)
    // The history the orphan carried is why adopting it matters at all.
    expect(rows[0].is_veteran).toBe(true)
  })

  it("refuses to write over another person's profile", async () => {
    const email = "test-basic-data-forged@example.com"
    const userId = await createTestAuthUser(email, "test1234", tracker)
    const otherUserId = await createTestAuthUser(
      "test-basic-data-victim@example.com",
      "test1234",
      tracker,
    )
    const victim = await createTestProfile(tracker, kysely, {
      email: "test-basic-data-victim@example.com",
      user_id: otherUserId,
      full_name: "Victim",
    })

    const result = await saveBasicData({
      answers: answersFor(email),
      context: {
        ...contextFor(email, userId),
        currentProfile: victim,
      } as never,
    })

    expect(result.ok).toBe(false)
    const untouched = await kysely
      .selectFrom("profiles")
      .select(["user_id", "email", "full_name"])
      .where("id", "=", victim.id)
      .executeTakeFirstOrThrow()
    expect(untouched).toEqual({
      user_id: otherUserId,
      email: "test-basic-data-victim@example.com",
      full_name: "Victim",
    })
  })

  it("writes every field of the profile, including the demographic ones", async () => {
    const email = "test-save-basic-data@example.com"
    const userId = await createTestAuthUser(email, "test1234", tracker)

    const profile = await createTestProfile(tracker, kysely, {
      email,
      user_id: userId,
      full_name: null,
    })

    await saveBasicData({
      answers: answersFor(email),
      context: contextFor(email, userId) as never,
    })

    const saved = await kysely
      .selectFrom("profiles")
      .selectAll()
      .where("id", "=", profile.id)
      .executeTakeFirstOrThrow()

    expect(saved.cpf).toBe("52998224725")
    // The driver hands an int8 column back as a string.
    expect(Number(saved.phone)).toBe(11999999999)
    expect(saved.gender).toEqual(["Travesti"])
    expect(saved.race_color).toEqual(["Preta"])
    expect(saved.basic_data_filled).toBe(true)
  })

  it("writes a phone flagged international, and unflags it once it is Brazilian again", async () => {
    const email = "test-save-basic-data-international@example.com"
    const userId = await createTestAuthUser(email, "test1234", tracker)
    const profile = await createTestProfile(tracker, kysely, {
      email,
      user_id: userId,
    })
    const flagOf = async () =>
      (
        await kysely
          .selectFrom("profiles")
          .select(["phone", "phone_is_international"])
          .where("id", "=", profile.id)
          .executeTakeFirstOrThrow()
      )

    await saveBasicData({
      answers: {
        ...answersFor(email),
        phone: "351912345678",
        confirm_phone: "351912345678",
        phone_is_international: true,
      },
      context: contextFor(email, userId) as never,
    })

    const international = await flagOf()
    expect(Number(international.phone)).toBe(351912345678)
    expect(international.phone_is_international).toBe(true)

    await saveBasicData({
      answers: answersFor(email),
      context: contextFor(email, userId) as never,
    })

    expect((await flagOf()).phone_is_international).toBe(false)
  })

  it("refuses a CPF another profile already holds, on the CPF field", async () => {
    const email = "test-save-basic-data-cpf-taken@example.com"
    const userId = await createTestAuthUser(email, "test1234", tracker)
    const profile = await createTestProfile(tracker, kysely, {
      email,
      user_id: userId,
      full_name: null,
    })
    await createTestProfile(tracker, kysely, {
      email: "test-save-basic-data-cpf-owner@example.com",
      user_id: null,
      cpf: "529.982.247-25",
    })

    const result = await saveBasicData({
      answers: answersFor(email),
      context: contextFor(email, userId) as never,
    })

    expect(result).toEqual({
      ok: false,
      errors: [{ questionId: "cpf", message: basicDataValidation.cpfTaken }],
    })
    const saved = await kysely
      .selectFrom("profiles")
      .select("cpf")
      .where("id", "=", profile.id)
      .executeTakeFirstOrThrow()
    expect(saved.cpf).not.toBe("52998224725")
  })

  it("saves a profile an admin exempted from the CPF, with no CPF", async () => {
    const email = "test-save-basic-data-cpf-exempt@example.com"
    const userId = await createTestAuthUser(email, "test1234", tracker)
    const profile = await createTestProfile(tracker, kysely, {
      email,
      user_id: userId,
      full_name: null,
      cpf_exempt: true,
    })

    const result = await saveBasicData({
      answers: { ...answersFor(email), cpf: "", rg: "X1234567", rg_issuer: "Alemanha" },
      context: { ...contextFor(email, userId), currentProfile: profile } as never,
    })

    expect(result).toEqual({ ok: true })
    const saved = await kysely
      .selectFrom("profiles")
      .select(["cpf", "cpf_exempt", "rg", "rg_issuer", "basic_data_filled"])
      .where("id", "=", profile.id)
      .executeTakeFirstOrThrow()
    expect(saved).toEqual({
      cpf: null,
      cpf_exempt: true,
      rg: "X1234567",
      rg_issuer: "Alemanha",
      basic_data_filled: true,
    })
  })

  it("re-syncs the newsletter now that there is a real name to file it under", async () => {
    const addSubscriber = vi.spyOn(listmonkClient, "addSubscriber")
    addSubscriber.mockResolvedValue({
      success: true,
      data: { subscriberId: 123 },
      errors: [],
    })

    const email = "test-newsletter-resync@example.com"
    const userId = await createTestAuthUser(email, "test1234", tracker)

    const profile = await createTestProfile(tracker, kysely, {
      email,
      user_id: userId,
      full_name: null,
      social_name: null,
    })

    await subscribeProfileToNewsletter(profile.id, "terms_and_conditions")

    // Filed under the e-mail, because that is all the profile had.
    expect(addSubscriber.mock.calls[0][0].name).toBe(email)
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("using email as name"),
      expect.objectContaining({ profileId: profile.id }),
    )
    addSubscriber.mockClear()

    await saveBasicData({
      answers: answersFor(email),
      context: contextFor(email, userId) as never,
    })

    expect(addSubscriber).toHaveBeenCalledOnce()
    expect(addSubscriber.mock.calls[0][0].attributes.full_name).toBe(
      "Maria Silva",
    )
    // A name refresh is not consent: it must not re-confirm any list.
    expect(addSubscriber.mock.calls[0][0].lists).toEqual([])
  })

  it("writes nothing when an answer is refused", async () => {
    const email = "test-refused-basic-data@example.com"
    const userId = await createTestAuthUser(email, "test1234", tracker)

    const profile = await createTestProfile(tracker, kysely, {
      email,
      user_id: userId,
      full_name: null,
      // The helper defaults this to true; the point here is that a refused save
      // does not turn it on.
      basic_data_filled: false,
    })

    const result = await saveBasicData({
      answers: { ...answersFor(email), cpf: "" },
      context: contextFor(email, userId) as never,
    })

    expect(result.ok).toBe(false)

    const saved = await kysely
      .selectFrom("profiles")
      .selectAll()
      .where("id", "=", profile.id)
      .executeTakeFirstOrThrow()

    expect(saved.full_name).toBeNull()
    expect(saved.basic_data_filled).toBe(false)
  })
})
