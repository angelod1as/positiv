import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createTestProfile, getTestSupabaseClient } from "~/test/db-test-utils"
import { cleanupAfterTest, setupIntegrationTest } from "~/test/integration-setup"
import * as listmonkClient from "../newsletter/listmonk-client.server"
import { subscribeProfileToNewsletter } from "../newsletter/auto-subscribe.server"
import { saveBasicData } from "./basic-data.server"

const answersFor = (email: string) => ({
  full_name: "Maria Silva",
  social_name: "Mari",
  date_of_birth: "1990-01-01",
  where_lives: "São Paulo",
  how_came_to_us: "Uma amiga",
  phone: "11999999999",
  confirm_phone: "11999999999",
  cpf: "12345678901",
  rg: "123456789",
  rg_issuer: "SSP/SP",
  gender: ["Travesti"],
  orientation: ["Bi"],
  pronouns: ["Ela/dela"],
  race_color: ["Preta"],
  email,
})

describe("saveBasicData - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()
  let supabase: ReturnType<typeof getTestSupabaseClient>

  beforeEach(() => {
    tracker.clear()
    vi.clearAllMocks()
    supabase = getTestSupabaseClient()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
    vi.restoreAllMocks()
  })

  const contextFor = (email: string, userId: string) => ({
    supabase,
    supabaseHeaders: new Headers(),
    currentUser: { id: userId, email },
    currentProfile: null,
    isProdInDev: false,
    host: null,
  })

  it("adopts the profile waiting under the same e-mail instead of writing a second one", async () => {
    const email = "test-orphan-adoption@example.com"
    const userId = crypto.randomUUID()

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

  it("writes every field of the profile, including the demographic ones", async () => {
    const email = "test-save-basic-data@example.com"
    const userId = crypto.randomUUID()

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

    expect(saved.cpf).toBe("12345678901")
    expect(saved.phone).toBe(11999999999)
    expect(saved.gender).toEqual(["Travesti"])
    expect(saved.race_color).toEqual(["Preta"])
    expect(saved.basic_data_filled).toBe(true)
  })

  it("re-syncs the newsletter now that there is a real name to file it under", async () => {
    const addSubscriber = vi.spyOn(listmonkClient, "addSubscriber")
    addSubscriber.mockResolvedValue({
      success: true,
      data: { subscriberId: 123 },
      errors: [],
    })

    const email = "test-newsletter-resync@example.com"
    const userId = crypto.randomUUID()

    const profile = await createTestProfile(tracker, kysely, {
      email,
      user_id: userId,
      full_name: null,
      social_name: null,
    })

    await subscribeProfileToNewsletter(profile.id, "terms_and_conditions")

    // Filed under the e-mail, because that is all the profile had.
    expect(addSubscriber.mock.calls[0][0].name).toBe(email)
    addSubscriber.mockClear()

    await saveBasicData({
      answers: answersFor(email),
      context: contextFor(email, userId) as never,
    })

    expect(addSubscriber).toHaveBeenCalledOnce()
    expect(addSubscriber.mock.calls[0][0].attributes.full_name).toBe(
      "Maria Silva",
    )
  })

  it("writes nothing when an answer is refused", async () => {
    const email = "test-refused-basic-data@example.com"
    const userId = crypto.randomUUID()

    const profile = await createTestProfile(tracker, kysely, {
      email,
      user_id: userId,
      full_name: null,
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
