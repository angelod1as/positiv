import { randomUUID } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { MANUALLY_ADDED_REFERRED } from "~/lib/constants/constants"
import {
  createTestEvent,
  createTestEventInvite,
  createTestEventParticipant,
  createTestProfile,
} from "~/test/db-test-utils"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import type { EventStatus } from "~types/database/entities.types"
import { addParticipantsDirectly } from "./add-participants-directly.server"

describe("adding participants directly", () => {
  const { tracker, kysely } = setupIntegrationTest()

  let originalLimit: number

  beforeEach(async () => {
    const row = await kysely
      .selectFrom("app_settings")
      .select("registration_limit")
      .executeTakeFirstOrThrow()
    originalLimit = row.registration_limit
  })

  afterEach(async () => {
    await setLimit(originalLimit)
    await cleanupAfterTest(tracker, kysely)
  })

  const setLimit = (limit: number) =>
    kysely
      .updateTable("app_settings")
      .set({ registration_limit: limit })
      .where("id", "=", true)
      .execute()

  const event = (event_status: EventStatus = "Registration Open") =>
    createTestEvent(tracker, kysely, {
      title: "Direct addition test event",
      event_status,
      time_event_start: new Date(Date.now() + 86400000).toISOString(),
    })

  const profile = (
    overrides: Partial<Parameters<typeof createTestProfile>[2]> = {},
  ) =>
    createTestProfile(tracker, kysely, {
      user_id: null,
      email: `direct-${randomUUID()}@test.com`,
      full_name: "Direct Addition",
      ...overrides,
    })

  const rowOf = (eventId: string, profileId: string) =>
    kysely
      .selectFrom("event_participants")
      .selectAll()
      .where("event_id", "=", eventId)
      .where("profile_id", "=", profileId)
      .executeTakeFirst()

  const statusOf = async (eventId: string) =>
    (
      await kysely
        .selectFrom("events")
        .select("event_status")
        .where("id", "=", eventId)
        .executeTakeFirstOrThrow()
    ).event_status

  it("adds a person as holding a spot, with the chosen spot type and the manual referral", async () => {
    const { id: eventId } = await event()
    const person = await profile({ approved_to_attend: "pending" })

    const outcomes = await addParticipantsDirectly({
      eventId,
      people: [{ profileId: person.id, spotType: "social" }],
    })

    expect(outcomes).toEqual([{ profileId: person.id, outcome: "added" }])
    const row = await rowOf(eventId, person.id)
    expect(row?.is_user_applied).toBe(true)
    expect(row?.spot_type).toBe("social")
    expect(row?.referred).toBe(MANUALLY_ADDED_REFERRED)

    const after = await kysely
      .selectFrom("profiles")
      .select("approved_to_attend")
      .where("id", "=", person.id)
      .executeTakeFirstOrThrow()
    expect(after.approved_to_attend).toBe("pending")
  })

  it("adds several people at once, each with their own spot type", async () => {
    const { id: eventId } = await event()
    const first = await profile()
    const second = await profile()

    await addParticipantsDirectly({
      eventId,
      people: [
        { profileId: first.id, spotType: "staff" },
        { profileId: second.id, spotType: "regular" },
      ],
    })

    expect((await rowOf(eventId, first.id))?.spot_type).toBe("staff")
    expect((await rowOf(eventId, second.id))?.spot_type).toBe("regular")
  })

  it("counts a regular spot toward the limit and closes registrations when it is reached", async () => {
    const { id: eventId } = await event("Registration Open")
    await setLimit(1)

    await addParticipantsDirectly({
      eventId,
      people: [{ profileId: (await profile()).id, spotType: "regular" }],
    })

    expect(await statusOf(eventId)).toBe("Registration Closed")
  })

  it("leaves a staff spot out of the limit", async () => {
    const { id: eventId } = await event("Registration Open")
    await setLimit(1)

    await addParticipantsDirectly({
      eventId,
      people: [{ profileId: (await profile()).id, spotType: "staff" }],
    })

    expect(await statusOf(eventId)).toBe("Registration Open")
  })

  it("lets the admin go past the limit once registrations are closed", async () => {
    const { id: eventId } = await event("Registration Closed")
    await setLimit(1)
    await createTestEventParticipant(tracker, kysely, {
      event_id: eventId,
      profile_id: (await profile()).id,
      is_user_applied: true,
    })
    const person = await profile()

    const outcomes = await addParticipantsDirectly({
      eventId,
      people: [{ profileId: person.id, spotType: "regular" }],
    })

    expect(outcomes).toEqual([{ profileId: person.id, outcome: "added" }])
    expect(await statusOf(eventId)).toBe("Registration Closed")
  })

  it("leaves an active application as it is", async () => {
    const { id: eventId } = await event()
    const person = await profile()
    await createTestEventParticipant(tracker, kysely, {
      event_id: eventId,
      profile_id: person.id,
      is_user_applied: true,
      spot_type: "regular",
      referred: "uma amiga",
    })

    const outcomes = await addParticipantsDirectly({
      eventId,
      people: [{ profileId: person.id, spotType: "staff" }],
    })

    expect(outcomes).toEqual([
      { profileId: person.id, outcome: "already-registered" },
    ])
    const row = await rowOf(eventId, person.id)
    expect(row?.spot_type).toBe("regular")
    expect(row?.referred).toBe("uma amiga")
  })

  it("reactivates a cancelled application", async () => {
    const { id: eventId } = await event()
    const person = await profile()
    await createTestEventParticipant(tracker, kysely, {
      event_id: eventId,
      profile_id: person.id,
      is_user_applied: false,
      cancellation_date: new Date().toISOString(),
      cancellation_reason: "Não posso mais ir",
      spot_type: "regular",
    })

    const outcomes = await addParticipantsDirectly({
      eventId,
      people: [{ profileId: person.id, spotType: "staff" }],
    })

    expect(outcomes).toEqual([{ profileId: person.id, outcome: "reactivated" }])
    const row = await rowOf(eventId, person.id)
    expect(row?.is_user_applied).toBe(true)
    expect(row?.cancellation_date).toBeNull()
    expect(row?.cancellation_reason).toBeNull()
    expect(row?.spot_type).toBe("staff")
    expect(row?.referred).toBe(MANUALLY_ADDED_REFERRED)
  })

  it("marks an open invite as used", async () => {
    const { id: eventId } = await event("Registration Closed")
    const person = await profile()
    const invite = await createTestEventInvite(tracker, kysely, {
      event_id: eventId,
      profile_id: person.id,
      token: randomUUID(),
    })

    await addParticipantsDirectly({
      eventId,
      people: [{ profileId: person.id, spotType: "regular" }],
    })

    const after = await kysely
      .selectFrom("event_invites")
      .select("used_at")
      .where("id", "=", invite.id)
      .executeTakeFirstOrThrow()
    expect(after.used_at).not.toBeNull()
  })

  it("leaves a revoked invite unused", async () => {
    const { id: eventId } = await event("Registration Closed")
    const person = await profile()
    const invite = await createTestEventInvite(tracker, kysely, {
      event_id: eventId,
      profile_id: person.id,
      token: randomUUID(),
      revoked_at: new Date().toISOString(),
    })

    await addParticipantsDirectly({
      eventId,
      people: [{ profileId: person.id, spotType: "regular" }],
    })

    const after = await kysely
      .selectFrom("event_invites")
      .select("used_at")
      .where("id", "=", invite.id)
      .executeTakeFirstOrThrow()
    expect(after.used_at).toBeNull()
  })

  it.each<EventStatus>([
    "Scheduled",
    "Registration Open",
    "Registration Closed",
    "Completed",
  ])("accepts an event that is %s", async (status) => {
    const { id: eventId } = await event(status)
    const person = await profile()

    const outcomes = await addParticipantsDirectly({
      eventId,
      people: [{ profileId: person.id, spotType: "regular" }],
    })

    expect(outcomes).toEqual([{ profileId: person.id, outcome: "added" }])
  })

  it.each<EventStatus>(["Draft", "Cancelled"])(
    "refuses an event that is %s and writes nothing",
    async (status) => {
      const { id: eventId } = await event(status)
      const person = await profile()

      await expect(
        addParticipantsDirectly({
          eventId,
          people: [{ profileId: person.id, spotType: "regular" }],
        }),
      ).rejects.toThrow()
      expect(await rowOf(eventId, person.id)).toBeUndefined()
    },
  )

  it("refuses an event that does not exist", async () => {
    const person = await profile()

    await expect(
      addParticipantsDirectly({
        eventId: randomUUID(),
        people: [{ profileId: person.id, spotType: "regular" }],
      }),
    ).rejects.toThrow()
  })

  it("turns away a profile without its basic data, or a rejected one, and adds the rest", async () => {
    const { id: eventId } = await event()
    const incomplete = await profile({ basic_data_filled: false })
    const rejected = await profile({ approved_to_attend: "rejected" })
    const eligible = await profile()

    const outcomes = await addParticipantsDirectly({
      eventId,
      people: [
        { profileId: incomplete.id, spotType: "regular" },
        { profileId: rejected.id, spotType: "regular" },
        { profileId: eligible.id, spotType: "regular" },
      ],
    })

    expect(outcomes).toEqual([
      { profileId: incomplete.id, outcome: "ineligible" },
      { profileId: rejected.id, outcome: "ineligible" },
      { profileId: eligible.id, outcome: "added" },
    ])
    expect(await rowOf(eventId, incomplete.id)).toBeUndefined()
    expect(await rowOf(eventId, rejected.id)).toBeUndefined()
  })
})
