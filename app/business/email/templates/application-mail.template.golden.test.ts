import { describe, expect, it, vi } from "vitest"
import { sendApplicationMail } from "~/business/participant/send-application-mail.server"
import { sendEmail } from "~/business/email/send-email"
import type { Event, ProfileWithRoles } from "~types/database/entities.types"
import { applicationMailTemplate } from "./application-mail.template"

vi.mock("~/business/email/send-email", () => ({
  sendEmail: vi.fn(async () => ({ success: true })),
}))
vi.mock("~/business/email/application-mail-copy.server", async () => {
  const { applicationCopyFallback } = await import(
    "~/business/email/application-mail-copy"
  )
  return { loadApplicationCopy: vi.fn(async () => applicationCopyFallback) }
})

const profile: NonNullable<ProfileWithRoles> = {
  id: "profile-1",
  full_name: "Ana Souza",
  social_name: "Ana",
  email: "ana@example.com",
  basic_data_filled: true,
  created_at: "2024-01-01T00:00:00Z",
  is_admin: false,
}

const event: Event = {
  id: "event-1",
  title: "Festa de Primavera",
  emoji: "🌸",
  location: "Casa Positiv",
  time_event_start: "2026-12-12T22:00:00-03:00",
  time_event_end: "2026-12-13T05:00:00-03:00",
  time_application_start: "2026-11-01T10:00:00-03:00",
  time_group_start: null,
  time_group_end: null,
  time_payment_start: null,
  time_payment_end: null,
  description: "",
  ticket_price: null,
  event_status: "Registration Open",
  event_type: "regular",
  auto_publish: false,
  created_at: "2026-01-01T00:00:00Z",
  total_spots: null,
  listmonk_list_id: null,
  listmonk_list_synced_at: null,
}

async function subjectFor(event: Event) {
  await sendApplicationMail({ profile, event })
  return vi.mocked(sendEmail).mock.lastCall?.[0].subject
}

// The application email must render byte-for-byte as it did before its copy
// moved to Sanity. The snapshot and the subjects below are the pre-move output,
// captured once from the original code; never regenerate them (no `-u`).
describe("application email byte-for-byte", () => {
  it("renders the frozen HTML with the default copy", () => {
    expect(applicationMailTemplate(profile, event)).toMatchSnapshot()
  })

  it("keeps the frozen subject", async () => {
    expect(await subjectFor(event)).toBe(
      "Recebemos sua candidatura ao evento 🌸 Festa de Primavera",
    )
  })
})
