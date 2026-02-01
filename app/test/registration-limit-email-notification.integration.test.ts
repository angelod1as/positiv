import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"
import { setupIntegrationTest, cleanupAfterTest } from "~/test/integration-setup"
import { createTestEvent, createTestProfile } from "~/test/db-test-utils"
import { action } from "~/pages/api/admin/send-registration-limit-email"
import * as sendEmailModule from "~/business/email/send-email"

vi.mock("~/business/email/send-email")

describe("Registration Limit Email Notification - E2E Integration", () => {
  const { tracker, kysely } = setupIntegrationTest()
  const mockSecret = "test-secret-123"

  beforeEach(async () => {
    tracker.clear()
    vi.clearAllMocks()
    vi.spyOn(sendEmailModule, "sendEmail").mockResolvedValue({
      success: true,
      data: undefined,
      errors: [],
    })
    process.env.INTERNAL_JOB_SECRET = mockSecret
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
    delete process.env.INTERNAL_JOB_SECRET
  })

  it("should return 401 when authorization header is missing", async () => {
    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event - No Auth",
      event_status: "Registration Closed",
    })

    const request = new Request("http://localhost/api/admin/send-registration-limit-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: event.id }),
    })

    const response = await action({ request, params: {}, context: {} })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Unauthorized")
    expect(sendEmailModule.sendEmail).not.toHaveBeenCalled()
  })

  it("should return 401 when authorization header is invalid", async () => {
    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event - Invalid Auth",
      event_status: "Registration Closed",
    })

    const request = new Request("http://localhost/api/admin/send-registration-limit-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer wrong-secret",
      },
      body: JSON.stringify({ eventId: event.id }),
    })

    const response = await action({ request, params: {}, context: {} })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Unauthorized")
    expect(sendEmailModule.sendEmail).not.toHaveBeenCalled()
  })

  it("should send email notification when API endpoint is called with valid auth", async () => {
    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event - Email Notification",
      event_status: "Registration Closed",
      emoji: "🎉",
    })

    const request = new Request("http://localhost/api/admin/send-registration-limit-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mockSecret}`,
      },
      body: JSON.stringify({ eventId: event.id }),
    })

    const response = await action({ request, params: {}, context: {} })
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(sendEmailModule.sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmailModule.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("limite de inscrições"),
        html: expect.any(String),
        text: expect.any(String),
      }),
    )
  })

  it("should record notification in tracking table", async () => {
    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event - Tracking",
      event_status: "Registration Closed",
    })

    const request = new Request("http://localhost/api/admin/send-registration-limit-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mockSecret}`,
      },
      body: JSON.stringify({ eventId: event.id }),
    })

    await action({ request, params: {}, context: {} })

    const notification = await kysely
      .selectFrom("event_registration_limit_emails")
      .selectAll()
      .where("event_id", "=", event.id)
      .executeTakeFirst()

    expect(notification).toBeDefined()
    expect(notification?.event_id).toBe(event.id)
    expect(notification?.admin_emails).toBeDefined()
  })

  it("should prevent duplicate email sends by checking before sending", async () => {
    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event - Duplicate Prevention",
      event_status: "Registration Closed",
    })

    const request1 = new Request("http://localhost/api/admin/send-registration-limit-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mockSecret}`,
      },
      body: JSON.stringify({ eventId: event.id }),
    })

    const request2 = new Request("http://localhost/api/admin/send-registration-limit-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mockSecret}`,
      },
      body: JSON.stringify({ eventId: event.id }),
    })

    const response1 = await action({ request: request1, params: {}, context: {} })
    const response2 = await action({ request: request2, params: {}, context: {} })

    const data1 = await response1.json()
    const data2 = await response2.json()

    expect(data1.success).toBe(true)
    expect(data2.success).toBe(true)
    expect(data2.message).toBe("Notification already sent")

    const notifications = await kysely
      .selectFrom("event_registration_limit_emails")
      .selectAll()
      .where("event_id", "=", event.id)
      .execute()

    expect(notifications.length).toBe(1)
    expect(sendEmailModule.sendEmail).toHaveBeenCalledTimes(1)
  })

  it("should return 400 when eventId is missing", async () => {
    const request = new Request("http://localhost/api/admin/send-registration-limit-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mockSecret}`,
      },
      body: JSON.stringify({}),
    })

    const response = await action({ request, params: {}, context: {} })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe("eventId is required")
  })

  it("should return 404 when event does not exist", async () => {
    const request = new Request("http://localhost/api/admin/send-registration-limit-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mockSecret}`,
      },
      body: JSON.stringify({ eventId: "00000000-0000-0000-0000-000000000000" }),
    })

    const response = await action({ request, params: {}, context: {} })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Event not found")
  })

  it("should return 500 with generic error when email sending fails", async () => {
    vi.spyOn(sendEmailModule, "sendEmail").mockResolvedValue({
      success: false,
      errors: [new Error("Email service unavailable")],
    })

    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event - Email Failure",
      event_status: "Registration Closed",
    })

    const request = new Request("http://localhost/api/admin/send-registration-limit-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mockSecret}`,
      },
      body: JSON.stringify({ eventId: event.id }),
    })

    const response = await action({ request, params: {}, context: {} })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Failed to send email")
  })

  it("should include participant count in email", async () => {
    const testId = Date.now()
    const event = await createTestEvent(tracker, kysely, {
      title: "Test Event - Participant Count",
      event_status: "Registration Closed",
      emoji: "🎊",
    })

    // Create some test participants
    const profile1 = await createTestProfile(tracker, kysely, {
      user_id: null,
      full_name: "Test User 1",
      email: `test-count-${testId}-1@example.com`,
      cpf: "12345678901",
      date_of_birth: "1990-01-01",
      phone: "11999999991",
    })

    const profile2 = await createTestProfile(tracker, kysely, {
      user_id: null,
      full_name: "Test User 2",
      email: `test-count-${testId}-2@example.com`,
      cpf: "12345678902",
      date_of_birth: "1990-01-02",
      phone: "11999999992",
    })

    await kysely
      .insertInto("event_participants")
      .values([
        {
          event_id: event.id,
          profile_id: profile1.id,
          is_user_applied: true,
          application_status: "finalised",
          attendance_status: "pending",
        },
        {
          event_id: event.id,
          profile_id: profile2.id,
          is_user_applied: true,
          application_status: "finalised",
          attendance_status: "pending",
        },
      ])
      .execute()

    const request = new Request("http://localhost/api/admin/send-registration-limit-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mockSecret}`,
      },
      body: JSON.stringify({ eventId: event.id }),
    })

    await action({ request, params: {}, context: {} })

    const emailCall = vi.mocked(sendEmailModule.sendEmail).mock.calls[0][0]
    expect(emailCall.html).toContain("Test Event - Participant Count")
    expect(emailCall.html).toContain("🎊")
    expect(emailCall.html).toContain("2")
  })
})
