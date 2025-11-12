import { eventOpeningMailTemplate } from '~/business/email/templates/event-opening-mail.template'
import type { ViewEvent } from '~types/database/entities.types'

// Sample event data with realistic values for preview
const sampleEvent: Omit<ViewEvent, "is_applied"> = {
  id: "sample-event-id",
  title: "Festa de Ano Novo 2025",
  emoji: "🎉",
  location: "Vila Madalena, São Paulo - SP",
  time_event_start: "2024-12-31T20:00:00-03:00",
  time_event_end: "2025-01-01T04:00:00-03:00",
  time_application_start: "2024-12-15T10:00:00-03:00",
  time_application_end: "2024-12-28T23:59:59-03:00",
  time_interviews_start: null,
  time_interviews_end: null,
  time_group_start: null,
  time_group_end: null,
  time_payment_start: null,
  time_payment_end: null,
  description: "Celebrate New Year with us!",
  ticket_price: null,
  event_status: "Registration Open",
}

const sampleProfileId = "sample-profile-123"

const html = eventOpeningMailTemplate(sampleEvent, sampleProfileId)
process.stdout.write(html)
