import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { 
  createTestProfile, 
  createTestEvent, 
  createTestEventParticipant,
  createTestAdminUser,
  cleanupTestAuthUsers 
} from "~/test/db-test-utils"
import {
  getEligibleRecipients,
  getRecipientCount,
  type SegmentFilter,
} from "./newsletter-recipients.server"

describe("Newsletter Recipients Segmentation - Integration Tests", () => {
  const { tracker, kysely } = setupIntegrationTest()
  const testEmails: string[] = []

  beforeEach(async () => {
    tracker.clear()
    testEmails.length = 0
    // Clear existing test data
    await kysely.deleteFrom("user_roles").execute()
    await kysely.deleteFrom("event_participants").execute()
    await kysely.deleteFrom("events").execute()
    await kysely.deleteFrom("profiles").execute()
  })

  afterEach(async () => {
    await kysely.deleteFrom("user_roles").execute()
    await cleanupTestAuthUsers(testEmails)
    await cleanupAfterTest(tracker, kysely)
  })

  describe("Admin-Only Segmentation", () => {
    it("should return only admin profiles when adminsOnly is true", async () => {
      // Create admin user using helper
      const adminEmail = "admin@test.com"
      testEmails.push(adminEmail)
      const { profile: adminProfile } = await createTestAdminUser(
        tracker,
        kysely,
        adminEmail,
        { full_name: "Admin User" }
      )
      
      // Create regular user profile (no admin role)
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "regular@test.com",
        full_name: "Regular User",
        allow_marketing_email: true,
      })
      
      // Test with adminsOnly filter
      const filter: SegmentFilter = { adminsOnly: true }
      const recipients = await getEligibleRecipients(kysely, filter)
      
      expect(recipients).toHaveLength(1)
      expect(recipients[0].email).toBe("admin@test.com")
      expect(recipients[0].id).toBe(adminProfile.id)
    })

    it("should combine adminsOnly with other filters", async () => {
      // Create admin veteran
      const adminVeteranEmail = "admin-veteran@test.com"
      testEmails.push(adminVeteranEmail)
      await createTestAdminUser(
        tracker,
        kysely,
        adminVeteranEmail,
        { 
          full_name: "Admin Veteran",
          is_veteran: true
        }
      )
      
      // Create admin newbie
      const adminNewbieEmail = "admin-newbie@test.com"
      testEmails.push(adminNewbieEmail)
      await createTestAdminUser(
        tracker,
        kysely,
        adminNewbieEmail,
        {
          full_name: "Admin Newbie",
          is_veteran: false
        }
      )
      
      // Create regular veteran (not admin)
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "regular-veteran@test.com",
        full_name: "Regular Veteran",
        allow_marketing_email: true,
        is_veteran: true,
      })
      
      // Test adminsOnly + veteransOnly
      const filter: SegmentFilter = { 
        adminsOnly: true,
        veteransOnly: true 
      }
      const recipients = await getEligibleRecipients(kysely, filter)
      
      expect(recipients).toHaveLength(1)
      expect(recipients[0].email).toBe("admin-veteran@test.com")
    })

    it("should return correct count for adminsOnly filter", async () => {
      // Create multiple admins
      for (let i = 0; i < 3; i++) {
        const email = `admin${i}@test.com`
        testEmails.push(email)
        await createTestAdminUser(tracker, kysely, email)
      }
      
      // Create regular users
      for (let i = 0; i < 2; i++) {
        await createTestProfile(tracker, kysely, {
          user_id: null,
          email: `regular${i}@test.com`,
          allow_marketing_email: true,
        })
      }
      
      // Test count
      const filter: SegmentFilter = { adminsOnly: true }
      const count = await getRecipientCount(kysely, filter)
      
      expect(count).toBe(3)
    })
  })

  describe("Rejected Participant Exclusion", () => {
    it("should exclude rejected participants by default", async () => {
      // Create profiles
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "normal@test.com",
        allow_marketing_email: true,
        approved_to_attend: "approved",
      })
      
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "rejected@test.com",
        allow_marketing_email: true,
        approved_to_attend: "rejected",
      })
      
      // Test with default (excludeRejected = true)
      const filter: SegmentFilter = {}
      const recipients = await getEligibleRecipients(kysely, filter)
      
      expect(recipients).toHaveLength(1)
      expect(recipients[0].email).toBe("normal@test.com")
    })

    it("should include rejected participants when excludeRejected is false", async () => {
      // Create profiles
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "normal@test.com",
        allow_marketing_email: true,
        approved_to_attend: "approved",
      })
      
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "rejected@test.com",
        allow_marketing_email: true,
        approved_to_attend: "rejected",
      })
      
      // Test with excludeRejected = false
      const filter: SegmentFilter = { excludeRejected: false }
      const recipients = await getEligibleRecipients(kysely, filter)
      
      expect(recipients).toHaveLength(2)
      expect(recipients.map(r => r.email).sort()).toEqual(["normal@test.com", "rejected@test.com"])
    })
  })

  describe("Activity-Based Segmentation", () => {
    describe("Never Attended", () => {
      it("should return profiles who never attended any event", async () => {
        // Create profiles
        await createTestProfile(tracker, kysely, {
          user_id: null,
          email: "never@test.com",
          allow_marketing_email: true,
        })
        
        const _hasAttended = await createTestProfile(tracker, kysely, {
          user_id: null,
          email: "attended@test.com",
          allow_marketing_email: true,
        })
        
        const _appliedOnly = await createTestProfile(tracker, kysely, {
          user_id: null,
          email: "applied@test.com",
          allow_marketing_email: true,
        })
        
        // Create an event
        const event = await createTestEvent(tracker, kysely, {
          title: "Test Event",
        })
        
        // Create participation records
        await createTestEventParticipant(tracker, kysely, {
          profile_id: _hasAttended.id,
          event_id: event.id,
          attendance_status: "attended",
        })
        
        await createTestEventParticipant(tracker, kysely, {
          profile_id: _appliedOnly.id,
          event_id: event.id,
          attendance_status: "pending",
        })
        
        // Test never_attended filter
        const filter: SegmentFilter = { activityType: "never_attended" }
        const recipients = await getEligibleRecipients(kysely, filter)
        
        expect(recipients).toHaveLength(2)
        expect(recipients.map(r => r.email).sort()).toEqual(["applied@test.com", "never@test.com"])
      })
    })

    describe("Has Attended", () => {
      it("should return profiles who have attended at least one event", async () => {
        // Create profiles
        await createTestProfile(tracker, kysely, {
          user_id: null,
          email: "never@test.com",
          allow_marketing_email: true,
        })
        
        const _hasAttended = await createTestProfile(tracker, kysely, {
          user_id: null,
          email: "attended@test.com",
          allow_marketing_email: true,
        })
        
        const _multipleAttended = await createTestProfile(tracker, kysely, {
          user_id: null,
          email: "multiple@test.com",
          allow_marketing_email: true,
        })
        
        // Create events
        const event1 = await createTestEvent(tracker, kysely, {
          title: "Test Event 1",
        })
        
        const event2 = await createTestEvent(tracker, kysely, {
          title: "Test Event 2",
        })
        
        // Create participation records
        await createTestEventParticipant(tracker, kysely, {
          profile_id: _hasAttended.id,
          event_id: event1.id,
          attendance_status: "attended",
        })
        
        await createTestEventParticipant(tracker, kysely, {
          profile_id: _multipleAttended.id,
          event_id: event1.id,
          attendance_status: "attended",
        })
        
        await createTestEventParticipant(tracker, kysely, {
          profile_id: _multipleAttended.id,
          event_id: event2.id,
          attendance_status: "attended",
        })
        
        // Test has_attended filter
        const filter: SegmentFilter = { activityType: "has_attended" }
        const recipients = await getEligibleRecipients(kysely, filter)
        
        expect(recipients).toHaveLength(2)
        expect(recipients.map(r => r.email).sort()).toEqual(["attended@test.com", "multiple@test.com"])
      })
    })

    describe("Never Applied", () => {
      it("should return new profiles who never applied to any event", async () => {
        // Create profiles with different registration dates
        await createTestProfile(tracker, kysely, {
          user_id: null,
          email: "new-no-app@test.com",
          allow_marketing_email: true,
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
        })
        
        const _newWithApplication = await createTestProfile(tracker, kysely, {
          user_id: null,
          email: "new-with-app@test.com",
          allow_marketing_email: true,
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
        })
        
        await createTestProfile(tracker, kysely, {
          user_id: null,
          email: "old-no-app@test.com",
          allow_marketing_email: true,
          created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(), // 100 days ago
        })
        
        // Create an event
        const event = await createTestEvent(tracker, kysely, {
          title: "Test Event",
        })
        
        // Create participation for one new profile
        await createTestEventParticipant(tracker, kysely, {
          profile_id: _newWithApplication.id,
          event_id: event.id,
          attendance_status: "pending",
        })
        
        // Test never_applied filter for last 30 days
        const filter: SegmentFilter = { 
          activityType: "never_applied",
          registeredWithinDays: 30 
        }
        const recipients = await getEligibleRecipients(kysely, filter)
        
        expect(recipients).toHaveLength(1)
        expect(recipients[0].email).toBe("new-no-app@test.com")
      })
    })

    describe("Applied But Never Attended", () => {
      it("should return profiles who applied but never attended", async () => {
        // Create profiles
        await createTestProfile(tracker, kysely, {
          user_id: null,
          email: "never-applied@test.com",
          allow_marketing_email: true,
        })
        
        const _appliedNotAttended = await createTestProfile(tracker, kysely, {
          user_id: null,
          email: "applied-not-attended@test.com",
          allow_marketing_email: true,
        })
        
        const _appliedAndAttended = await createTestProfile(tracker, kysely, {
          user_id: null,
          email: "applied-attended@test.com",
          allow_marketing_email: true,
        })
        
        // Create events
        const event1 = await createTestEvent(tracker, kysely, {
          title: "Test Event 1",
        })
        
        const event2 = await createTestEvent(tracker, kysely, {
          title: "Test Event 2",
        })
        
        // Create participation records
        await createTestEventParticipant(tracker, kysely, {
          profile_id: _appliedNotAttended.id,
          event_id: event1.id,
          attendance_status: "pending",
        })
        
        await createTestEventParticipant(tracker, kysely, {
          profile_id: _appliedAndAttended.id,
          event_id: event1.id,
          attendance_status: "pending",
        })
        
        await createTestEventParticipant(tracker, kysely, {
          profile_id: _appliedAndAttended.id,
          event_id: event2.id,
          attendance_status: "attended",
        })
        
        // Test applied_never_attended filter
        const filter: SegmentFilter = { activityType: "applied_never_attended" }
        const recipients = await getEligibleRecipients(kysely, filter)
        
        expect(recipients).toHaveLength(1)
        expect(recipients[0].email).toBe("applied-not-attended@test.com")
      })
    })
  })

  describe("Combined Filters", () => {
    it("should filter veterans correctly", async () => {
      // Create profiles
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "veteran@test.com",
        allow_marketing_email: true,
        is_veteran: true,
        approved_to_attend: "approved",
      })
      
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "newbie@test.com",
        allow_marketing_email: true,
        is_veteran: false,
        approved_to_attend: "approved",
      })
      
      // Test simple veteran filter
      const filter: SegmentFilter = { veteransOnly: true }
      const recipients = await getEligibleRecipients(kysely, filter)
      
      expect(recipients).toHaveLength(1)
      expect(recipients[0].email).toBe("veteran@test.com")
      expect(recipients[0].is_veteran).toBe(true)
    })
    
    it("should combine veteran filter with activity filters", async () => {
      // Create profiles - explicitly set is_veteran to true/false
      // Note: When someone attends an event, they automatically become a veteran via trigger
      // So we need to test with different statuses
      const _veteranAttended = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "veteran-attended@test.com",
        allow_marketing_email: true,
        is_veteran: true,
        approved_to_attend: "approved",
      })
      
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "veteran-never@test.com",
        allow_marketing_email: true,
        is_veteran: true,
        approved_to_attend: "approved",
      })
      
      const _newbieApplied = await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "newbie-applied@test.com",
        allow_marketing_email: true,
        is_veteran: false,
        approved_to_attend: "approved",
      })
      
      // Verify the profiles are created correctly
      const checkProfiles = await kysely
        .selectFrom("profiles")
        .select(["email", "is_veteran", "approved_to_attend"])
        .where("email", "in", ["veteran-attended@test.com", "veteran-never@test.com", "newbie-applied@test.com"])
        .execute()
      
      expect(checkProfiles).toHaveLength(3)
      const veteranCheck = checkProfiles.find(p => p.email === "veteran-attended@test.com")
      const newbieCheck = checkProfiles.find(p => p.email === "newbie-applied@test.com")
      expect(veteranCheck?.is_veteran).toBe(true)
      expect(newbieCheck?.is_veteran).toBe(false)
      
      
      // Create an event
      const event = await createTestEvent(tracker, kysely, {
        title: "Test Event",
      })
      
      // Create participation records
      await createTestEventParticipant(tracker, kysely, {
        profile_id: _veteranAttended.id,
        event_id: event.id,
        attendance_status: "attended",
      })
      
      // Newbie applied but hasn't attended yet
      await createTestEventParticipant(tracker, kysely, {
        profile_id: _newbieApplied.id,
        event_id: event.id,
        attendance_status: "pending",
      })
      
      // First, test just the has_attended filter
      const hasAttendedFilter: SegmentFilter = { 
        activityType: "has_attended" 
      }
      const allAttended = await getEligibleRecipients(kysely, hasAttendedFilter)
      expect(allAttended).toHaveLength(1) // Only veteran who attended
      expect(allAttended[0].email).toBe("veteran-attended@test.com")
      
      // Now test veterans only filter
      const veteransOnlyFilter: SegmentFilter = { 
        veteransOnly: true 
      }
      const allVeterans = await getEligibleRecipients(kysely, veteransOnlyFilter)
      expect(allVeterans).toHaveLength(2) // Both veterans
      expect(allVeterans.map(r => r.email).sort()).toEqual([
        "veteran-attended@test.com",
        "veteran-never@test.com"
      ])
      
      // Test veterans who have attended
      const filter: SegmentFilter = { 
        veteransOnly: true,
        activityType: "has_attended" 
      }
      const recipients = await getEligibleRecipients(kysely, filter)
      
      expect(recipients).toHaveLength(1)
      expect(recipients[0].email).toBe("veteran-attended@test.com")
    })
  })

  describe("Recipient Count", () => {
    it("should return correct counts for each segment", async () => {
      // Create a diverse set of profiles
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "veteran1@test.com",
        allow_marketing_email: true,
        is_veteran: true,
      })
      
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "veteran2@test.com",
        allow_marketing_email: true,
        is_veteran: true,
      })
      
      await createTestProfile(tracker, kysely, {
        user_id: null,
        email: "newbie1@test.com",
        allow_marketing_email: true,
        is_veteran: false,
      })
      
      // Test counts
      const allCount = await getRecipientCount(kysely, {})
      expect(allCount).toBe(3)
      
      const veteranCount = await getRecipientCount(kysely, { veteransOnly: true })
      expect(veteranCount).toBe(2)
      
      const newbieCount = await getRecipientCount(kysely, { newbiesOnly: true })
      expect(newbieCount).toBe(1)
    })
  })
})