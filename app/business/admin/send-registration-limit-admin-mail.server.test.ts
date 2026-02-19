import { describe, expect, it, vi, beforeEach } from "vitest"
import { sendRegistrationLimitAdminMail } from "./send-registration-limit-admin-mail.server"
import * as getAdminEmailsModule from "./get-admin-emails.server"
import * as sendEmailModule from "~/business/email/send-email"
import type { Event } from "~types/database/entities.types"

vi.mock("./get-admin-emails.server")
vi.mock("~/business/email/send-email")

describe("sendRegistrationLimitAdminMail", () => {
    const mockEvent: Event = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    title: "Test Event",
    emoji: "🎉",
    location: "Test Location",
    description: "Test Description",
    time_event_start: "2026-02-15T19:00:00Z",
    time_event_end: "2026-02-16T03:00:00Z",
    time_application_start: "2026-02-01T00:00:00Z",
    time_group_start: "2026-02-14T19:00:00Z",
    time_group_end: "2026-02-14T20:00:00Z",
    time_payment_start: "2026-02-12T00:00:00Z",
    time_payment_end: "2026-02-14T23:59:59Z",
    ticket_price: 30,
    event_status: "Registration Closed",
    event_type: "regular",
    auto_publish: false,
    created_at: "2025-01-01T00:00:00Z",
    total_spots: null,
    listmonk_list_id: null,
    listmonk_list_synced_at: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should get admin emails and send email to all admins", async () => {
    const adminEmails = ["admin1@example.com", "admin2@example.com"]
    vi.spyOn(getAdminEmailsModule, "getAdminEmails").mockResolvedValue(adminEmails)
    vi.spyOn(sendEmailModule, "sendEmail").mockResolvedValue({ success: true, data: undefined, errors: [] })

    const result = await sendRegistrationLimitAdminMail({
      event: mockEvent,
      participantCount: 90,
      timestamp: new Date("2026-02-01T14:30:00Z"),
    })

    expect(getAdminEmailsModule.getAdminEmails).toHaveBeenCalledTimes(1)
    expect(sendEmailModule.sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmailModule.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: adminEmails,
        subject: expect.stringContaining("limite de inscrições"),
        html: expect.any(String),
        text: expect.any(String),
      })
    )
    expect(result.emailSent).toBe(true)
  })

  it("should return false when there are no admin emails", async () => {
    vi.spyOn(getAdminEmailsModule, "getAdminEmails").mockResolvedValue([])

    const result = await sendRegistrationLimitAdminMail({
      event: mockEvent,
      participantCount: 90,
      timestamp: new Date("2026-02-01T14:30:00Z"),
    })

    expect(result.emailSent).toBe(false)
    expect(sendEmailModule.sendEmail).not.toHaveBeenCalled()
  })

  it("should return false when email sending fails", async () => {
    const adminEmails = ["admin@example.com"]
    vi.spyOn(getAdminEmailsModule, "getAdminEmails").mockResolvedValue(adminEmails)
    vi.spyOn(sendEmailModule, "sendEmail").mockResolvedValue({
      success: false,
      errors: [new Error("Email failed")],
    })

    const result = await sendRegistrationLimitAdminMail({
      event: mockEvent,
      participantCount: 90,
      timestamp: new Date("2026-02-01T14:30:00Z"),
    })

    expect(result.emailSent).toBe(false)
  })

  it("should include all event details in email", async () => {
    const adminEmails = ["admin@example.com"]
    vi.spyOn(getAdminEmailsModule, "getAdminEmails").mockResolvedValue(adminEmails)
    vi.spyOn(sendEmailModule, "sendEmail").mockResolvedValue({ success: true, data: undefined, errors: [] })

    await sendRegistrationLimitAdminMail({
      event: mockEvent,
      participantCount: 90,
      timestamp: new Date("2026-02-01T14:30:00Z"),
    })

    const emailCall = vi.mocked(sendEmailModule.sendEmail).mock.calls[0][0]
    expect(emailCall.html).toContain("Test Event")
    expect(emailCall.html).toContain("🎉")
    expect(emailCall.html).toContain("90")
  })
})
