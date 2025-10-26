import { z } from "zod"

import type { Selectable } from "kysely"
import { currentProfileSchema } from "~/business/common"
import type {
  GENDERS,
  ORIENTATIONS,
  PRONOUNS,
  RACE_COLOR,
} from "~/lib/constants/constants"
import type { Database } from "./database.types"

// TODO: POS-136 selectable, insertable, updateable types
// https://kysely.dev/docs/getting-started

// General Fetcher data from Composables
export type ComposableFetcherData =
  | {
      success: boolean
      intent: string
      errors?: Record<"_global", string[]>
    }
  | undefined

/** Extension of User with more data, so, called Profile */
const _profileWithRoles = currentProfileSchema.nullable()
export type ProfileWithRoles = z.infer<typeof _profileWithRoles>

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]

export type ParticipantApplicationStatus =
  Database["public"]["Enums"]["application_status_enum"]
export type ParticipantAttendanceStatus =
  Database["public"]["Enums"]["attendance_status_enum"]
export type ProfileApprovedToAttendStatus =
  Database["public"]["Enums"]["approved_to_attend_enum"]
export type ProfileFlagStatus = Database["public"]["Enums"]["profile_flag_enum"]

/** Event Type */
export type EventType = Database["public"]["Enums"]["event_type_enum"]

/** Events information */
export type Event = Omit<
  Database["public"]["Tables"]["events"]["Row"],
  "event_status"
> & {
  event_status: EventStatus
  is_applied?: boolean
  is_set_reminder?: boolean
}

/** Participant information */
export type Participant = Profile &
  Database["public"]["Tables"]["event_participants"]["Row"]

/** Event Status */
export type EventStatus = Database["public"]["Enums"]["event_status"]

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
  is_set_reminder?: boolean
}

const participantApplicationStatus = [
  "pending",
  "talking",
  "sent_payment_data",
  "sent_rules",
  "think_better",
  "finalised",
] as const satisfies ParticipantApplicationStatus[]

export const participantApplicationStatusEnum = z.enum(
  participantApplicationStatus,
)

const participantAttendanceStatus = [
  "pending",
  "attended",
  "not-attended",
  "skipped",
  "will-not-go",
] as const satisfies ParticipantAttendanceStatus[]

const profileApprovedToAttendStatus = [
  "pending",
  "approved",
  "approved_with_reservations",
  "rejected",
] as const satisfies ProfileApprovedToAttendStatus[]

const profileFlagStatus = [
  "none",
  "yellow",
  "red",
  "gray",
] as const satisfies ProfileFlagStatus[]

export const participantAttendanceStatusEnum = z.enum(
  participantAttendanceStatus,
)
export const profileApprovedToAttendStatusEnum = z.enum(
  profileApprovedToAttendStatus,
)
export const profileFlagStatusEnum = z.enum(profileFlagStatus)

export type Genders = (typeof GENDERS)[number]
export type Orientations = (typeof ORIENTATIONS)[number]
export type Pronouns = (typeof PRONOUNS)[number]
export type RaceColor = (typeof RACE_COLOR)[number]

/////
// Kysely helpers
/////

export type EventParticipant = Selectable<
  Database["public"]["Tables"]["event_participants"]["Row"]
>

export type ParticipantVsEvent = EventParticipant & {
  event_title: Event["title"]
  event_emoji: Event["emoji"]
  is_veteran: Profile["is_veteran"]
  approved_to_attend: Profile["approved_to_attend"]
}
