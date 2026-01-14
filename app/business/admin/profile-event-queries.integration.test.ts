import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import {
  createTestEvent,
  createTestEventParticipant,
  createTestProfile,
} from "~/test/db-test-utils"
import {
  getEventParticipantBasic,
  updateProfileAdminNotes,
} from "./admin.server"

describe("getEventParticipantBasic - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()

    await kysely
      .deleteFrom("event_participants")
      .where("profile_id", "in", (eb) =>
        eb
          .selectFrom("profiles")
          .select("id")
          .where("email", "like", "test-ep-basic-%")
      )
      .execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should return event_participant data for a given profile and event", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-ep-basic-lookup@example.com",
      full_name: "Test EP Basic Lookup",
    })

    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event EP Basic",
      emoji: "🔍",
      location: "Test Location",
      description: "Test Description",
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      time_event_end: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
      ).toISOString(),
      time_application_start: new Date().toISOString(),
      ticket_price: 100,
      total_spots: 50,
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event.id,
      is_user_applied: true,
      application_status: "finalised",
      attendance_status: "pending",
      admin_general_notes: "Test admin notes",
      payment: 100,
      has_paid: true,
    })

    const result = await getEventParticipantBasic({
      profileId: profile.id,
      eventId: event.id,
    })

    expect(result.success).toBe(true)
    if (result.success && result.data) {
      expect(result.data.profile_id).toBe(profile.id)
      expect(result.data.event_id).toBe(event.id)
      expect(result.data.application_status).toBe("finalised")
      expect(result.data.attendance_status).toBe("pending")
      expect(result.data.admin_general_notes).toBe("Test admin notes")
      expect(result.data.has_paid).toBe(true)
      // Should NOT include profile fields like full_name, is_veteran, flag, etc.
      expect(result.data).not.toHaveProperty("full_name")
      expect(result.data).not.toHaveProperty("email")
    } else {
      throw new Error("Expected result.data to be defined")
    }
  })

  it("should return null when no event_participant exists for profile+event", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-ep-basic-no-record@example.com",
      full_name: "Test EP Basic No Record",
    })

    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event No EP",
      emoji: "❌",
      location: "Test Location",
      description: "Test Description",
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      time_event_end: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
      ).toISOString(),
      time_application_start: new Date().toISOString(),
      ticket_price: 100,
      total_spots: 50,
    })

    const result = await getEventParticipantBasic({
      profileId: profile.id,
      eventId: event.id,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBeNull()
    }
  })

  it("should include all event_participant fields", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-ep-basic-all-fields@example.com",
      full_name: "Test EP Basic All Fields",
    })

    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event All Fields",
      emoji: "📋",
      location: "Test Location",
      description: "Test Description",
      event_status: "Registration Open",
      event_type: "regular",
      time_event_start: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      time_event_end: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
      ).toISOString(),
      time_application_start: new Date().toISOString(),
      ticket_price: 100,
      total_spots: 50,
    })

    await createTestEventParticipant(tracker, kysely, {
      profile_id: profile.id,
      event_id: event.id,
      is_user_applied: true,
      application_status: "talking",
      attendance_status: "pending",
      admin_general_notes: "Admin notes here",
      spot_type: "regular",
      was_selected_for_rotation: true,
      bond: "Friend of someone",
      companions: "Partner name",
      notes: "Participant notes",
      referrals: "Referral info",
    })

    const result = await getEventParticipantBasic({
      profileId: profile.id,
      eventId: event.id,
    })

    expect(result.success).toBe(true)
    if (result.success && result.data) {
      // All event_participant table fields should be present
      expect(result.data).toHaveProperty("id")
      expect(result.data).toHaveProperty("profile_id")
      expect(result.data).toHaveProperty("event_id")
      expect(result.data).toHaveProperty("application_status")
      expect(result.data).toHaveProperty("attendance_status")
      expect(result.data).toHaveProperty("has_paid")
      expect(result.data).toHaveProperty("payment")
      expect(result.data).toHaveProperty("spot_type")
      expect(result.data).toHaveProperty("was_selected_for_rotation")
      expect(result.data).toHaveProperty("admin_general_notes")
      expect(result.data).toHaveProperty("bond")
      expect(result.data).toHaveProperty("companions")
      expect(result.data).toHaveProperty("notes")
      expect(result.data).toHaveProperty("referrals")
      // Event info fields should be present (for display purposes)
      expect(result.data).toHaveProperty("event_title")
      expect(result.data).toHaveProperty("event_emoji")
      expect(result.data.event_title).toBe("Test Event All Fields")
      expect(result.data.event_emoji).toBe("📋")
    }
  })
})

describe("updateProfileAdminNotes - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()

  beforeEach(async () => {
    tracker.clear()

    await kysely
      .deleteFrom("profiles")
      .where("email", "like", "test-admin-notes-%")
      .execute()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  it("should update flag field only", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-admin-notes-flag@example.com",
      full_name: "Test Admin Notes Flag",
      flag: "none",
      flag_notes: null,
      general_notes: null,
      is_veteran: false,
    })

    const result = await updateProfileAdminNotes({
      intent: "update-profile-admin-notes",
      profile_id: profile.id,
      flag: "yellow",
      flag_notes: "Warning for behavior",
    })

    expect(result.success).toBe(true)

    const updatedProfile = await kysely
      .selectFrom("profiles")
      .selectAll()
      .where("id", "=", profile.id)
      .executeTakeFirst()

    expect(updatedProfile?.flag).toBe("yellow")
    expect(updatedProfile?.flag_notes).toBe("Warning for behavior")
    // Other fields unchanged
    expect(updatedProfile?.general_notes).toBeNull()
    expect(updatedProfile?.is_veteran).toBe(false)
  })

  it("should update general_notes field only", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-admin-notes-general@example.com",
      full_name: "Test Admin Notes General",
      flag: "none",
      general_notes: null,
      is_veteran: false,
    })

    const result = await updateProfileAdminNotes({
      intent: "update-profile-admin-notes",
      profile_id: profile.id,
      general_notes: "Important notes about this person",
    })

    expect(result.success).toBe(true)

    const updatedProfile = await kysely
      .selectFrom("profiles")
      .selectAll()
      .where("id", "=", profile.id)
      .executeTakeFirst()

    expect(updatedProfile?.general_notes).toBe(
      "Important notes about this person"
    )
    // Other fields unchanged
    expect(updatedProfile?.flag).toBe("none")
    expect(updatedProfile?.is_veteran).toBe(false)
  })

  it("should update is_veteran field only", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-admin-notes-veteran@example.com",
      full_name: "Test Admin Notes Veteran",
      flag: "none",
      general_notes: "Existing notes",
      is_veteran: false,
    })

    const result = await updateProfileAdminNotes({
      intent: "update-profile-admin-notes",
      profile_id: profile.id,
      is_veteran: true,
    })

    expect(result.success).toBe(true)

    const updatedProfile = await kysely
      .selectFrom("profiles")
      .selectAll()
      .where("id", "=", profile.id)
      .executeTakeFirst()

    expect(updatedProfile?.is_veteran).toBe(true)
    // Other fields unchanged
    expect(updatedProfile?.flag).toBe("none")
    expect(updatedProfile?.general_notes).toBe("Existing notes")
  })

  it("should update multiple fields at once", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-admin-notes-multi@example.com",
      full_name: "Test Admin Notes Multi",
      flag: "none",
      flag_notes: null,
      general_notes: null,
      is_veteran: false,
    })

    const result = await updateProfileAdminNotes({
      intent: "update-profile-admin-notes",
      profile_id: profile.id,
      flag: "red",
      flag_notes: "Serious warning",
      general_notes: "General notes here",
      is_veteran: true,
    })

    expect(result.success).toBe(true)

    const updatedProfile = await kysely
      .selectFrom("profiles")
      .selectAll()
      .where("id", "=", profile.id)
      .executeTakeFirst()

    expect(updatedProfile?.flag).toBe("red")
    expect(updatedProfile?.flag_notes).toBe("Serious warning")
    expect(updatedProfile?.general_notes).toBe("General notes here")
    expect(updatedProfile?.is_veteran).toBe(true)
  })

  it("should fail when profile_id does not exist", async () => {
    const result = await updateProfileAdminNotes({
      intent: "update-profile-admin-notes",
      profile_id: "00000000-0000-0000-0000-000000000000",
      flag: "yellow",
      flag_notes: "Test notes",
    })

    expect(result.success).toBe(false)
  })

  it("should require flag_notes when setting non-none flag", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-admin-notes-validation@example.com",
      full_name: "Test Admin Notes Validation",
      flag: "none",
    })

    const result = await updateProfileAdminNotes({
      intent: "update-profile-admin-notes",
      profile_id: profile.id,
      flag: "yellow",
      // flag_notes not provided
    })

    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()
  })

  it("should allow clearing flag to none without notes", async () => {
    const profile = await createTestProfile(tracker, kysely, {
      user_id: null,
      email: "test-admin-notes-clear@example.com",
      full_name: "Test Admin Notes Clear",
      flag: "yellow",
      flag_notes: "Previous warning",
    })

    const result = await updateProfileAdminNotes({
      intent: "update-profile-admin-notes",
      profile_id: profile.id,
      flag: "none",
    })

    expect(result.success).toBe(true)

    const updatedProfile = await kysely
      .selectFrom("profiles")
      .selectAll()
      .where("id", "=", profile.id)
      .executeTakeFirst()

    expect(updatedProfile?.flag).toBe("none")
  })
})
