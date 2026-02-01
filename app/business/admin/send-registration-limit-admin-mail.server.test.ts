import { describe, expect, it, vi, beforeEach } from "vitest"
import { sendRegistrationLimitAdminMail } from "./send-registration-limit-admin-mail.server"
import * as getAdminEmailsModule from "./get-admin-emails.server"
import * as sendEmailModule from "~/business/email/send-email"
import type { ViewEvent } from "~types/database/entities.types"

vi.mock("./get-admin-emails.server")
vi.mock("~/business/email/send-email")

describe("sendRegistrationLimitAdminMail", () => {
  const mockEvent: Omit<ViewEvent, "is_applied"> = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    title: "Test Event",
    emoji: "🎉",
    location: "Test Location",
    time_event_start: "2026-02-15T19:00:00Z",
    time_event_end: "2026-02-16T03:00:00Z",
    time_registration_start: "2026-02-01T00:00:00Z",
    time_registration_end: "2026-02-10T23:59:59Z",
    event_status: "Registration Closed",
    event_type: "Festinha",
    has_rotation: false,
    auto_publish: false,
    created_at: "2026-01-15T00:00:00Z",
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should get admin emails and send email to all admins", async () => {
    const adminEmails = ["admin1@example.com", "admin2@example.com"]
    vi.spyOn(getAdminEmailsModule, "getAdminEmails").mockResolvedValue(adminEmails)
    vi.spyOn(sendEmailModule, "sendEmail").mockResolvedValue({ success: true, data: undefined })

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
    vi.spyOn(sendEmailModule, "sendEmail").mockResolvedValue({ success: true, data: undefined })

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
