import { zod } from "~/lib/helpers/zod"
import {
  participantApplicationStatusEnum,
  participantAttendanceStatusEnum,
  profileApprovedToAttendStatusEnum,
  profileFlagStatusEnum,
  type EventStatus,
} from "~types/database/entities.types"
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

  event_type: zod.enum(["regular", "bdsm"]).default("regular"),
  auto_publish: zod.boolean().default(true),

  time_event_start: datetime,
  time_event_end: datetime,
  time_application_start: datetime,
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

  event_type: zod.enum(["regular", "bdsm"]).nullish(),
  auto_publish: zod.boolean().nullish(),

  time_event_start: datetime.nullish(),
  time_event_end: datetime.nullish(),
  time_application_start: datetime.nullish(),
  time_group_start: datetime.nullish(),
  time_group_end: datetime.nullish(),
  time_payment_start: datetime.nullish(),
  time_payment_end: datetime.nullish(),
})

export const adminContextSchema = userContextSchema.extend({
  eventId: zod.string().optional(),
})

export const updateEventStatusSchema = zod.object({
  intent: zod.string(),
  event_status: zod.custom<EventStatus>(),
})

export const updateEventDemographicsSchema = zod.object({
  intent: zod.string(),
})

const spotTypeEnum = zod.enum(["regular", "social", "staff"])

export const updateParticipantVsEventSchema = zod.object({
  profile_id: zod.string(),
  event_id: zod.string(),
  intent: zod.literal("participant-vs-event-schema"),
  attendance_status: participantAttendanceStatusEnum,
  application_status: participantApplicationStatusEnum,
  has_paid: zod.boolean(),
  spot_type: spotTypeEnum,
  is_veteran: zod.boolean(),
  approved_to_attend: profileApprovedToAttendStatusEnum,
  payment: zod.coerce.number(),
  admin_general_notes: zod.string(),
  flag: profileFlagStatusEnum,
  flag_notes: zod.string().nullable(),
}).refine(
  (data) => {
    // If flag is not "none", flag_notes must be provided
    if (data.flag !== "none") {
      return data.flag_notes !== null && data.flag_notes.trim().length > 0
    }
    return true
  },
  {
    message: "Notas da Flag são obrigatórias quando uma flag é selecionada",
    path: ["flag_notes"],
  }
)

const parseBoolean = zod.union([
  zod.literal("true").transform(() => true),
  zod.literal("false").transform(() => false),
  zod.boolean(),
])

export const updateEventParticipantByIdSchema = zod.object({
  id: zod.string(),
  profile_id: zod.string(),
  intent: zod.literal("update-event-participant"),
  payment: zod.coerce.number().optional(),
  attendance_status: participantAttendanceStatusEnum.optional(),
  application_status: participantApplicationStatusEnum.optional(),
  approved_to_attend: profileApprovedToAttendStatusEnum.optional(),
  has_paid: parseBoolean.optional(),
  spot_type: spotTypeEnum.optional(),
  is_veteran: parseBoolean.optional(),
  flag: profileFlagStatusEnum.optional(),
  flag_notes: zod.string().nullable().optional(),
  notes: zod.string().optional(),
  admin_general_notes: zod.string().optional(),
  companions: zod.string().optional(),
}).refine(
  (data) => {
    // If flag is provided and not "none", flag_notes must be provided
    if (data.flag && data.flag !== "none") {
      return data.flag_notes !== null && data.flag_notes !== undefined && data.flag_notes.trim().length > 0
    }
    return true
  },
  {
    message: "Notas da Flag são obrigatórias quando uma flag é selecionada",
    path: ["flag_notes"],
  }
)
