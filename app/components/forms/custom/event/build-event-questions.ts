import { eventFormSchema } from "~/business/admin/common"
import type { Question } from "~/components/forms/runtime/question.types"
import { adminEventsCopy } from "~/copy/admin/events"

const { labels, descriptions, placeholders, ticketPricePrefix, totalSpotsSuffix } =
  adminEventsCopy.form

/**
 * Everything an event is described by, in the order the schema describes it.
 * Where each one sits on the page is `buildEventLayout`'s business.
 *
 * The id is not among them: it is not something anyone answers, and the page
 * that holds it sends it with the save.
 */
export function buildEventQuestions(): Question[] {
  const { shape } = eventFormSchema

  return [
    {
      id: "title",
      prompt: labels.title,
      input: { kind: "text", placeholder: placeholders.title },
      schema: shape.title,
    },
    {
      id: "emoji",
      prompt: labels.emoji,
      input: { kind: "text" },
      schema: shape.emoji,
    },
    {
      id: "description",
      prompt: labels.description,
      help: descriptions.description,
      input: { kind: "textarea", placeholder: placeholders.description },
      schema: shape.description,
    },
    {
      id: "location",
      prompt: labels.location,
      input: { kind: "text", placeholder: placeholders.location },
      schema: shape.location,
    },
    {
      id: "ticket_price",
      prompt: labels.ticket_price,
      input: {
        kind: "textnumber",
        placeholder: placeholders.ticket_price,
        prefix: ticketPricePrefix,
      },
      schema: shape.ticket_price,
    },
    {
      id: "total_spots",
      prompt: labels.total_spots,
      input: {
        kind: "textnumber",
        placeholder: placeholders.total_spots,
        suffix: totalSpotsSuffix,
      },
      schema: shape.total_spots,
    },
    {
      id: "auto_publish",
      prompt: labels.auto_publish,
      help: descriptions.auto_publish,
      input: { kind: "boolean" },
      schema: shape.auto_publish,
    },
    {
      id: "time_event_start",
      prompt: labels.time_event_start,
      input: { kind: "datetime" },
      schema: shape.time_event_start,
    },
    {
      id: "time_event_end",
      prompt: labels.time_event_end,
      input: { kind: "datetime" },
      schema: shape.time_event_end,
    },
    {
      id: "time_application_start",
      prompt: labels.time_application_start,
      input: { kind: "datetime" },
      schema: shape.time_application_start,
    },
    {
      id: "time_group_start",
      prompt: labels.time_group_start,
      input: { kind: "datetime" },
      schema: shape.time_group_start,
    },
    {
      id: "time_group_end",
      prompt: labels.time_group_end,
      input: { kind: "datetime" },
      schema: shape.time_group_end,
    },
    {
      id: "time_payment_start",
      prompt: labels.time_payment_start,
      input: { kind: "datetime" },
      schema: shape.time_payment_start,
    },
    {
      id: "time_payment_end",
      prompt: labels.time_payment_end,
      input: { kind: "datetime" },
      schema: shape.time_payment_end,
    },
  ]
}
