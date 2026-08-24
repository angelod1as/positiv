import { format } from "date-fns/format"
import type { Answers } from "~/components/forms/runtime/question.types"
import { dateTimeFormat } from "~/lib/utils"
import type { Event } from "~types/database/entities.types"

const TEXT_FIELDS = ["title", "emoji", "description", "location"] as const

const NUMBER_FIELDS = ["ticket_price", "total_spots"] as const

const TIME_FIELDS = [
  "time_event_start",
  "time_event_end",
  "time_application_start",
  "time_group_start",
  "time_group_end",
  "time_payment_start",
  "time_payment_end",
] as const

/**
 * What an event already says about itself, in the shape the run reads.
 *
 * A field the event has not got is left out rather than handed over empty: an
 * answer of "" is an answer, and it would fail the question's own rules before
 * anyone had the chance to write one.
 */
export function toEventAnswers(event: Event | null | undefined): Answers {
  // Publishing itself is the schema's own default, and a new event should open
  // with the box in the state it would be saved in.
  if (!event) return { auto_publish: true }

  const answers: Answers = { auto_publish: event.auto_publish ?? true }

  for (const field of TEXT_FIELDS) {
    const value = event[field]
    if (value) answers[field] = value
  }

  // Written as text because that is what a number field reads back, and asked
  // about by name rather than for truthiness: a price of zero is an answer, and
  // a text field left empty is not. Dropping a zero here would hand the admin a
  // blank field where the database says nothing was charged.
  for (const field of NUMBER_FIELDS) {
    const value = event[field]
    if (value !== null && value !== undefined) answers[field] = String(value)
  }

  // The column keeps seconds and sometimes a zone; a datetime control shows
  // neither, and would come up empty rather than showing the time it was given.
  for (const field of TIME_FIELDS) {
    const value = event[field]
    if (value) answers[field] = format(new Date(value), dateTimeFormat)
  }

  return answers
}
