import { z } from "zod"

import { currentProfileSchema } from "~/business/common"
import type { Database } from "./database.types"

/** Extension of User with more data, so, called Profile */
const _profileWithRoles = currentProfileSchema.nullable()
export type ProfileWithRoles = z.infer<typeof _profileWithRoles>

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]

/** Events information */
export type Event = Omit<
  Database["public"]["Tables"]["events"]["Row"],
  "event_status"
> & {
  event_status: EventStatus
  is_applied?: boolean
}

/** Participant information */
export type Participant = Profile &
  Omit<
    Database["public"]["Tables"]["event_participants"]["Row"],
    "process_status"
  > & {
    process_status: ParticipantProcessStatus
  }

/** Event Status */
export type EventStatus =
  | "Draft"
  | "Completed"
  | "Cancelled"
  | "Scheduled"
  | "Registration Closed"
  | "Registration Open"
  // When the user has already applied:
  | "Already Applied"

/** Limited event information */
export type ViewEvent = Pick<
  Event,
  | "id"
  | "description"
  | "emoji"
  | "time_event_start"
  | "time_event_end"
  | "time_application_start"
  | "time_interviews_start"
  | "location"
  | "ticket_price"
  | "title"
  | "time_application_end"
  | "time_group_end"
  | "time_group_start"
  | "time_interviews_end"
  | "time_payment_start"
  | "time_payment_end"
> & {
  event_status: EventStatus
  is_applied?: boolean
}

//////////
// Participant Process Status
//////////

export const participantProcessStatus = [
  "applied",
  "talking",
  "sent_payment_data",
  "paid",
  "sent_rules",
  "think_better",
] as const

export const participantProcessStatusEnum = z.enum(participantProcessStatus)

export type ParticipantProcessStatus = z.infer<
  typeof participantProcessStatusEnum
>

export const participantProcessStatusMap: Record<
  ParticipantProcessStatus,
  string
> = {
  applied: "Inscrite",
  paid: "Pago",
  talking: "Conversando",
  think_better: "Pensar melhor",
  sent_rules: "Regras enviadas",
  sent_payment_data: "Dados de pagto enviados",
}
