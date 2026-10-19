import { describe, expect, it, vi } from "vitest"
import { formatRegistrationLimitAdminMail } from "~/business/email/format-registration-limit-admin-mail"
import type { Event } from "~types/database/entities.types"
import { registrationLimitReachedAdminTemplate } from "./registration-limit-reached-admin.template"

vi.mock("~/business/email/registration-limit-admin-mail-copy.server", async () => {
  const { registrationLimitAdminCopyFallback } = await import(
    "~/business/email/registration-limit-admin-mail-copy"
  )
  return {
    loadRegistrationLimitAdminCopy: vi.fn(
      async () => registrationLimitAdminCopyFallback,
    ),
  }
})

const subjectFor = async (event: Event) =>
  (await formatRegistrationLimitAdminMail(event, 90, timestamp)).subject

const event: Event = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  title: "Festa de Primavera",
  emoji: "🌸",
  location: "Casa Positiv",
  description: "",
  time_event_start: "2026-12-12T22:00:00Z",
  time_event_end: "2026-12-13T05:00:00Z",
  time_application_start: "2026-11-01T10:00:00Z",
  time_group_start: null,
  time_group_end: null,
  time_payment_start: null,
  time_payment_end: null,
  ticket_price: 25000,
  event_status: "Registration Closed",
  event_type: "regular",
  auto_publish: false,
  created_at: "2026-01-01T00:00:00Z",
  total_spots: null,
  listmonk_list_id: null,
  listmonk_list_synced_at: null,
}

const timestamp = new Date("2026-11-02T14:30:00Z")

// The registration-limit email must render byte-for-byte as it did before its
// copy moved to Sanity. The snapshot and the subjects below are the pre-move
// output, captured once from the original code; never regenerate them (no `-u`).
describe("registration-limit email byte-for-byte", () => {
  it("renders the frozen HTML with the default copy", () => {
    expect(
      registrationLimitReachedAdminTemplate(event, 90, timestamp),
    ).toMatchSnapshot()
  })

  it("keeps the frozen subject", async () => {
    expect(await subjectFor(event)).toBe(
      "📊 Evento atingiu limite de candidaturas - 🌸 Festa de Primavera",
    )
  })

  it("keeps the frozen subject for an event without an emoji", async () => {
    expect(await subjectFor({ ...event, emoji: null })).toBe(
      "📊 Evento atingiu limite de candidaturas - null Festa de Primavera",
    )
  })
})
