import type { SupabaseClient } from "@supabase/supabase-js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventParticipant,
  createTestProfile,
} from "~/test/db-test-utils"
import {
  LISTMONK_REGISTERED_LIST_ID,
  LISTMONK_VETERANS_LIST_ID,
} from "~/lib/constants/constants"
import { logger } from "~/lib/logger/logger.server"
import type { ListSubscriber } from "~/business/newsletter/listmonk-lists.server"
import type { EventStatus } from "~types/database/entities.types"

const SECRET = "pos656-test-secret"

const {
  getListSubscribers,
  addSubscribersToListBulk,
  removeSubscribersFromListBulk,
} = vi.hoisted(() => ({
  getListSubscribers: vi.fn(),
  addSubscribersToListBulk: vi.fn(),
  removeSubscribersFromListBulk: vi.fn(),
}))

vi.mock("varlock/env", async (importOriginal) => {
  const original = await importOriginal<{ ENV: Record<string, unknown> }>()
  return {
    ENV: new Proxy(original.ENV, {
      get: (target, key: string) =>
        key === "INTERNAL_JOB_SECRET" ? SECRET : Reflect.get(target, key),
    }),
  }
})

vi.mock("~/business/newsletter/listmonk-lists.server", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getListSubscribers,
}))

vi.mock("~/business/newsletter/listmonk-client.server", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  addSubscribersToListBulk,
  removeSubscribersFromListBulk,
}))

import {
  updateEventParticipantById,
  updateEventStatus,
  updateProfileAdminNotes,
} from "./admin.server"
import { action as syncVeteransListRoute } from "~/routes/api.sync-veterans-list"

const subscriber = (id: number, email: string): ListSubscriber => ({
  id,
  email,
  name: email,
  status: "enabled",
  updated_at: "2026-10-29T10:00:00.000Z",
  lists: [],
})

const ok = { success: true, data: undefined, errors: [] }

describe("Veterans list sync triggers - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  let registered: ListSubscriber[]
  let veteransList: ListSubscriber[]

  beforeEach(() => {
    tracker.clear()
    vi.clearAllMocks()
    registered = []
    veteransList = []
    getListSubscribers.mockImplementation(
      async (listId: number, membership?: string) => {
        if (listId === LISTMONK_REGISTERED_LIST_ID) {
          return { success: true, data: registered, errors: [] }
        }
        if (listId === LISTMONK_VETERANS_LIST_ID && membership !== "unsubscribed") {
          return { success: true, data: veteransList, errors: [] }
        }
        return { success: true, data: [], errors: [] }
      },
    )
    addSubscribersToListBulk.mockResolvedValue(ok)
    removeSubscribersFromListBulk.mockResolvedValue(ok)
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await cleanupAfterTest(tracker, kysely)
  })

  const createConsentedProfile = async (email: string, isVeteran: boolean) => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email,
      is_veteran: isVeteran,
    })

    const row = await kysely
      .insertInto("newsletter_subscriptions")
      .values({
        profile_id: profile.id,
        subscription_source: "manual_button",
        consent_given: true,
        sync_status: "synced",
      })
      .returning("id")
      .executeTakeFirstOrThrow()
    tracker.track("newsletter_subscriptions", row.id)

    return profile
  }

  const adminContext = (eventId: string) => ({
    supabase: {} as SupabaseClient,
    supabaseHeaders: new Headers(),
    currentUser: { id: "test-user-id", email: "test@example.com" },
    currentProfile: null,
    isProdInDev: false,
    host: null,
    eventId,
    params: {},
    events: [],
  })

  const createParticipant = async (email: string, isVeteran: boolean) => {
    const profile = await createConsentedProfile(email, isVeteran)
    const event = await createTestEvent(tracker, kysely, {
      title: "POS-656 Event",
      time_event_start: new Date().toISOString(),
    })
    const participant = await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event.id,
      is_user_applied: true,
      attendance_status: "pending",
    })
    return { profile, event, participant }
  }

  it("adds someone who attended to the Veterans list when the event is completed", async () => {
    const profile = await createConsentedProfile("pos656-attended@example.com", false)
    const event = await createTestEvent(tracker, kysely, {
      title: "POS-656 Completed Event",
      time_event_start: new Date().toISOString(),
    })
    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event.id,
      is_user_applied: true,
      attendance_status: "attended",
    })
    registered = [subscriber(65601, "pos656-attended@example.com")]

    const result = await updateEventStatus(
      { event_status: "Completed" as EventStatus },
      adminContext(event.id),
    )

    expect(result.success).toBe(true)
    expect(addSubscribersToListBulk).toHaveBeenCalledWith(
      [65601],
      LISTMONK_VETERANS_LIST_ID,
    )
  })

  it("adds someone an admin marks as a veteran on the event participant screen", async () => {
    const { profile, participant } = await createParticipant(
      "pos656-marked@example.com",
      false,
    )
    registered = [subscriber(65602, "pos656-marked@example.com")]

    const result = await updateEventParticipantById({
      id: participant.id,
      profile_id: profile.id,
      intent: "update-event-participant",
      is_veteran: true,
    })

    expect(result.success).toBe(true)
    expect(addSubscribersToListBulk).toHaveBeenCalledWith(
      [65602],
      LISTMONK_VETERANS_LIST_ID,
    )
  })

  it("does not sync when an event participant edit leaves the veteran flag alone", async () => {
    const { profile, participant } = await createParticipant(
      "pos656-untouched@example.com",
      false,
    )

    const result = await updateEventParticipantById({
      id: participant.id,
      profile_id: profile.id,
      intent: "update-event-participant",
      notes: "no veteran change",
    })

    expect(result.success).toBe(true)
    expect(getListSubscribers).not.toHaveBeenCalled()
  })

  it("removes someone an admin unmarks as a veteran on the profile screen", async () => {
    const profile = await createConsentedProfile("pos656-unmarked@example.com", true)
    await createConsentedProfile("pos656-stays@example.com", true)
    registered = [
      subscriber(65603, "pos656-unmarked@example.com"),
      subscriber(65604, "pos656-stays@example.com"),
    ]
    veteransList = [...registered]

    const result = await updateProfileAdminNotes({
      intent: "update-profile-admin-notes",
      profile_id: profile.id,
      is_veteran: false,
    })

    expect(result.success).toBe(true)
    expect(removeSubscribersFromListBulk).toHaveBeenCalledWith(
      [65603],
      LISTMONK_VETERANS_LIST_ID,
    )
    expect(addSubscribersToListBulk).not.toHaveBeenCalled()
  })

  it("keeps the admin's change when Listmonk fails, and logs it", async () => {
    const warn = vi.spyOn(logger, "warn")
    getListSubscribers.mockResolvedValue({
      success: false,
      errors: [new Error("Listmonk is down")],
    })
    const { profile, participant } = await createParticipant(
      "pos656-listmonk-down@example.com",
      false,
    )

    const participantResult = await updateEventParticipantById({
      id: participant.id,
      profile_id: profile.id,
      intent: "update-event-participant",
      is_veteran: true,
    })
    const notesResult = await updateProfileAdminNotes({
      intent: "update-profile-admin-notes",
      profile_id: profile.id,
      general_notes: "still a veteran",
      is_veteran: true,
    })

    expect(participantResult.success).toBe(true)
    expect(notesResult.success).toBe(true)
    const stored = await kysely
      .selectFrom("profiles")
      .select(["is_veteran", "general_notes"])
      .where("id", "=", profile.id)
      .executeTakeFirstOrThrow()
    expect(stored).toEqual({ is_veteran: true, general_notes: "still a veteran" })
    expect(warn).toHaveBeenCalledWith(
      "Failed to sync the Veterans Listmonk list:",
      expect.anything(),
    )
  })

  it("keeps the admin's change when the Listmonk call throws", async () => {
    const warn = vi.spyOn(logger, "warn")
    getListSubscribers.mockRejectedValue(new Error("socket hang up"))
    const { profile, participant } = await createParticipant(
      "pos656-listmonk-throws@example.com",
      false,
    )

    const result = await updateEventParticipantById({
      id: participant.id,
      profile_id: profile.id,
      intent: "update-event-participant",
      is_veteran: true,
    })

    expect(result.success).toBe(true)
    const stored = await kysely
      .selectFrom("profiles")
      .select("is_veteran")
      .where("id", "=", profile.id)
      .executeTakeFirstOrThrow()
    expect(stored.is_veteran).toBe(true)
    expect(warn).toHaveBeenCalledWith(
      "Failed to sync the Veterans Listmonk list:",
      expect.anything(),
    )
  })

  it("keeps the event completed when Listmonk fails", async () => {
    getListSubscribers.mockResolvedValue({
      success: false,
      errors: [new Error("Listmonk is down")],
    })
    const event = await createTestEvent(tracker, kysely, {
      title: "POS-656 Completed While Listmonk Is Down",
      time_event_start: new Date().toISOString(),
    })

    const result = await updateEventStatus(
      { event_status: "Completed" as EventStatus },
      adminContext(event.id),
    )

    expect(result.success).toBe(true)
    const stored = await kysely
      .selectFrom("events")
      .select("event_status")
      .where("id", "=", event.id)
      .executeTakeFirstOrThrow()
    expect(stored.event_status).toBe("Completed")
  })

  describe("/api/sync-veterans-list", () => {
    const callRoute = (headers: HeadersInit) => {
      const url = "http://localhost:5173/api/sync-veterans-list"
      return syncVeteransListRoute({
        request: new Request(url, { method: "POST", headers }),
        url: new URL(url),
        pattern: "/api/sync-veterans-list",
        params: {},
        context: {},
      })
    }

    it("rejects a request without the secret and leaves Listmonk alone", async () => {
      const response = await callRoute({})

      expect(response.status).toBe(401)
      expect(getListSubscribers).not.toHaveBeenCalled()
    })

    it("adds a consenting veteran the other triggers missed", async () => {
      await createConsentedProfile("pos656-daily@example.com", true)
      registered = [subscriber(65605, "pos656-daily@example.com")]

      const response = await callRoute({ Authorization: `Bearer ${SECRET}` })

      expect(response.status).toBe(200)
      expect(addSubscribersToListBulk).toHaveBeenCalledWith(
        [65605],
        LISTMONK_VETERANS_LIST_ID,
      )
    })
  })
})
