import { zod } from "~/lib/helpers/zod"
import type { EventStatus } from "~types/entities.types"
import { userContextSchema } from "../common"

const messages = {
  min2: "mínimo de 2 caracters",
  min1: "mínimo de 1 caracter",
  max1: "máximo de 1 caracter",
  max50: "máximo de 50 caracters",
  max255: "máximo de 255 caracters",
  emoji: "precisa ser um emoji",
  min1num: "mínimo 1",
}

const preprocessDateTime = (value: unknown) => {
  if (typeof value === "string") {
    if (value === "") return ""
    const date = new Date(value)
    return date.toISOString()
  }
  return value
}

const datetime = zod.preprocess(preprocessDateTime, zod.string().datetime())

export const eventFormSchema = zod.object({
  id: zod.string().optional(),
  title: zod.string().min(2).max(50),
  description: zod.string().min(2, messages.min2).max(255, messages.max255),
  emoji: zod.string().emoji(messages.emoji).min(1, messages.min1),
  location: zod.string().min(2, messages.min2).max(255, messages.max255),

  ticket_price: zod.coerce.number().min(1, messages.min1num),
  total_spots: zod.coerce.number().min(1, messages.min1num),

  time_event_start: datetime,
  time_event_end: datetime,
  time_application_end: datetime,
  time_application_start: datetime,
  time_interviews_end: datetime,
  time_interviews_start: datetime,
  time_group_start: datetime,
  time_group_end: datetime,
  time_payment_start: datetime,
  time_payment_end: datetime,
})

export const eventSchema = zod.object({
  id: zod.string(),
  title: zod.string().nullish(),
  description: zod.string().nullish(),
  emoji: zod.string().nullish(),
  location: zod.string().nullish(),

  ticket_price: zod.coerce.number().nullish(),
  total_spots: zod.coerce.number().nullish(),

  time_event_start: datetime.nullish(),
  time_event_end: datetime.nullish(),
  time_application_end: datetime.nullish(),
  time_application_start: datetime.nullish(),
  time_interviews_end: datetime.nullish(),
  time_interviews_start: datetime.nullish(),
  time_group_start: datetime.nullish(),
  time_group_end: datetime.nullish(),
  time_payment_start: datetime.nullish(),
  time_payment_end: datetime.nullish(),
})

export const adminContextSchema = userContextSchema.extend({
  events: zod.array(eventSchema),
  eventId: zod.string().optional(),
})

export const updateEventStatusSchema = zod.object({
  intent: zod.string(),
  event_status: zod.custom<EventStatus>(),
})

export const updateParticipantPropertySchema = zod.object({
  participantId: zod.string(),
  property: zod.enum([
    "is_veteran",
    "is_social_spot",
    "was_admin_skipped_last_event",
    "payment",
    "process_status",
  ]),
  value: zod.union([zod.boolean(), zod.string(), zod.number()]),
})

export const sendEventRemindersSchema = zod.object({
  intent: zod.string(),
  event_id: zod.string(),
  event_status: zod.custom<EventStatus>(),
})

export const ParticipantVsEventSchema = zod.object({
  profile_id: zod.string(),
  event_id: zod.string(),
  intent: zod.literal("participant-vs-event-schema"),
  process_status: zod.string(),
  is_social_spot: zod.boolean(),
  is_staff_spot: zod.boolean(),
  payment: zod.coerce.number(),
  admin_general_notes: zod.string(),
})
