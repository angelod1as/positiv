import { describe, expect, it, vi, beforeEach } from "vitest"
import { sendApplicationMail } from "./send-application-mail.server"
import type { ProfileWithRoles, ViewEvent } from "~types/database/entities.types"

vi.mock("~/business/email/send-email", () => ({
  sendEmail: vi.fn(),
}))

vi.mock("~/business/email/format-application-mail", () => ({
  formatApplicationMail: vi.fn(),
}))

import { sendEmail } from "~/business/email/send-email"
import { formatApplicationMail } from "~/business/email/format-application-mail"

describe("sendApplicationMail", () => {
  const mockProfile: NonNullable<ProfileWithRoles> = {
    id: "profile-123",
    email: "test@example.com",
    full_name: "Test User",
    basic_data_filled: true,
    social_name: null,
    pronouns: null,
    rg: null,
    cpf: null,
    phone: null,
    date_of_birth: null,
    gender: null,
    orientation: null,
    where_lives: null,
    how_came_to_us: null,
    rg_issuer: null,
    created_at: "2025-01-01T00:00:00Z",
    is_admin: false,
  }

  const mockEvent: ViewEvent = {
    id: "event-123",
    title: "Test Event",
    emoji: "🎉",
    description: "Test description",
    time_event_start: "2025-02-01T18:00:00Z",
    time_event_end: "2025-02-01T23:00:00Z",
    time_application_start: "2025-01-15T00:00:00Z",
    time_group_start: null,
    time_group_end: null,
    time_payment_start: null,
    time_payment_end: null,
    location: "Test Location",
    ticket_price: null,
    event_status: "Registration Open",
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(formatApplicationMail).mockResolvedValue({
      html: "<p>Test email</p>",
      text: "Test email",
    })
  })

  it("should return { emailSent: true } when email sends successfully", async () => {
    vi.mocked(sendEmail).mockResolvedValue({
      success: true,
      data: undefined,
      errors: [],
    })

    const result = await sendApplicationMail({
      profile: mockProfile,
      event: mockEvent,
    })

    expect(result).toEqual({ emailSent: true })
    expect(sendEmail).toHaveBeenCalledWith({
      to: "test@example.com",
      subject: "Você se inscreveu no evento 🎉 Test Event",
      text: "Test email",
      html: "<p>Test email</p>",
    })
  })

  it("should return { emailSent: false } when email fails (not throw)", async () => {
    vi.mocked(sendEmail).mockResolvedValue({
      success: false,
      errors: [new Error("SMTP error")],
    })

    const result = await sendApplicationMail({
      profile: mockProfile,
      event: mockEvent,
    })

    expect(result).toEqual({ emailSent: false })
  })

  it("should return { emailSent: false } when profile has no email", async () => {
    const profileWithoutEmail = {
      ...mockProfile,
      email: null,
    }

    const result = await sendApplicationMail({
      profile: profileWithoutEmail as NonNullable<ProfileWithRoles>,
      event: mockEvent,
    })

    expect(result).toEqual({ emailSent: false })
    expect(sendEmail).not.toHaveBeenCalled()
  })
})
