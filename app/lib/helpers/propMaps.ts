import { adminPropMapsCopy } from "~/copy/admin/prop-maps"
import { GENDERS, ORIENTATIONS } from "~/lib/constants/constants"
import {
  type Event,
  type EventParticipant,
  type EventStatus,
  type ParticipantApplicationStatus,
  type ParticipantAttendanceStatus,
  type Profile,
  type ProfileApprovedToAttendStatus,
  type ProfileFlagStatus,
} from "~types/database/entities.types"

export const profilePropMap = (property: keyof Profile) => {
  return adminPropMapsCopy.profileFields[property]
}

export const eventPropNameMap = (property: keyof Event) => {
  return adminPropMapsCopy.eventFields[property]
}

export const eventParticipantPropMap = (property: keyof EventParticipant) => {
  return adminPropMapsCopy.eventParticipantFields[property]
}

export const eventStatusMap = (event_status: EventStatus) => {
  return adminPropMapsCopy.eventStatus[event_status] || ""
}

const participantApplicationStatus: Record<
  ParticipantApplicationStatus,
  string
> = adminPropMapsCopy.applicationStatus

const participantAttendanceStatus: Record<ParticipantAttendanceStatus, string> =
  adminPropMapsCopy.attendanceStatus

const profileApprovedToAttendStatus: Record<
  ProfileApprovedToAttendStatus,
  string
> = adminPropMapsCopy.approvedToAttend

const profileFlagStatus: Record<ProfileFlagStatus, string> =
  adminPropMapsCopy.flagStatus

export const participantApplicationStatusPropMap = (
  application_status: ParticipantApplicationStatus,
) => {
  return participantApplicationStatus[application_status] || ""
}

export const profileFlagStatusMap = (flag: ProfileFlagStatus) => {
  return profileFlagStatus[flag] || ""
}

export const participantAttendanceStatusPropMap = (
  attendance_status: ParticipantAttendanceStatus,
) => {
  return participantAttendanceStatus[attendance_status] || ""
}

export const profileApprovedToAttendStatusPropMap = (
  approved_to_attend: ProfileApprovedToAttendStatus,
) => {
  return profileApprovedToAttendStatus[approved_to_attend] || ""
}

export const applicationStatusOptions: Array<{
  name: string
  value: ParticipantApplicationStatus
}> = Object.entries(participantApplicationStatus).map(([value, name]) => ({
  name: name,
  label: name,
  value: value as ParticipantApplicationStatus,
}))

export const attendanceStatusOptions: Array<{
  name: string
  value: ParticipantAttendanceStatus
}> = Object.entries(participantAttendanceStatus).map(([value, name]) => ({
  name: name,
  label: name,
  value: value as ParticipantAttendanceStatus,
}))

export const approvedToAttendStatusOptions: Array<{
  name: string
  value: ProfileApprovedToAttendStatus
}> = Object.entries(profileApprovedToAttendStatus).map(([value, name]) => ({
  name: name,
  label: name,
  value: value as ProfileApprovedToAttendStatus,
}))

const isVeteranStatusMap: Record<string, string> = adminPropMapsCopy.isVeteran

export const isVeteranOptions: Array<{
  name: string
  value: string
  label: string
}> = Object.entries(isVeteranStatusMap).map(([value, name]) => ({
  name: name,
  label: name,
  value: value,
}))

const paymentStatusMap: Record<string, string> = adminPropMapsCopy.paymentStatus

export const paymentStatusOptions: Array<{
  name: string
  value: string
  label: string
}> = Object.entries(paymentStatusMap).map(([value, name]) => ({
  name: name,
  label: name,
  value: value,
}))

/** `none` is the value the grid gives a participant with no payment at all. */
export const paymentStatusPropMap = (status: string) =>
  paymentStatusMap[status] || ""

export const PARTICIPANTS_TABLE_FILTER_CONFIGS = {
  application_status: {
    storageKey: "admin-participants-filter-application-status",
    options: applicationStatusOptions,
    matchMode: "custom_application_status",
    get allValues() {
      return this.options.map((opt) => opt.value)
    },
  },
  attendance_status: {
    storageKey: "admin-participants-filter-attendance-status",
    options: attendanceStatusOptions,
    matchMode: "custom_attendance_status",
    get allValues() {
      return this.options.map((opt) => opt.value)
    },
  },
  approved_to_attend: {
    storageKey: "admin-participants-filter-approved-to-attend",
    options: approvedToAttendStatusOptions,
    matchMode: "custom_approved_to_attend",
    get allValues() {
      return this.options.map((opt) => opt.value)
    },
  },
  gender: {
    storageKey: "admin-participants-filter-gender",
    options: [
      { name: "Homem cis", label: "Homem cis", value: "homem cis" },
      { name: "Mulher cis", label: "Mulher cis", value: "mulher cis" },
      {
        name: "Pessoa não binária",
        label: "Pessoa não binária",
        value: "pessoa não binária",
      },
    ] as Array<{ name: string; value: string; label: string }>,
    matchMode: "custom_gender",
    get allValues() {
      return this.options.map((opt) => opt.value)
    },
  },
  orientation: {
    storageKey: "admin-participants-filter-orientation",
    options: [
      { name: "Heterossexual", label: "Heterossexual", value: "heterossexual" },
      { name: "Bissexual", label: "Bissexual", value: "bissexual" },
      { name: "Pansexual", label: "Pansexual", value: "pansexual" },
      { name: "Assexual", label: "Assexual", value: "assexual" },
    ] as Array<{ name: string; value: string; label: string }>,
    matchMode: "custom_orientation",
    get allValues() {
      return this.options.map((opt) => opt.value)
    },
  },
  is_veteran: {
    storageKey: "admin-participants-filter-is-veteran",
    options: isVeteranOptions,
    matchMode: "custom_is_veteran",
    get allValues() {
      return this.options.map((opt) => opt.value)
    },
  },
} as const

/**
 * Keyed by the type rather than listed loose, so that a status added to the
 * database cannot quietly go missing here: this stops compiling until it is
 * written down, and the screens that offer a status — and the schema that
 * accepts one — all read the list below.
 *
 * The order is the order an admin is offered them in.
 */
const EVERY_EVENT_STATUS: Record<EventStatus, true> = {
  Draft: true,
  Scheduled: true,
  "Registration Open": true,
  "Registration Closed": true,
  Cancelled: true,
  Completed: true,
}

export const ALL_EVENT_STATUS_OPTIONS = Object.keys(
  EVERY_EVENT_STATUS,
) as EventStatus[]

export const eventStatusOptions = ALL_EVENT_STATUS_OPTIONS.map((status) => ({
  name: eventStatusMap(status),
  value: status,
  label: eventStatusMap(status),
}))

export const DEFAULT_EVENT_STATUS_FILTER: EventStatus[] = [
  "Draft",
  "Scheduled",
  "Registration Open",
  "Registration Closed",
  "Completed",
]

export const EVENTS_TABLE_FILTER_CONFIGS = {
  event_status: {
    storageKey: "admin-events-filter-status",
    options: eventStatusOptions,
    matchMode: "custom_event_status",
    defaultSelected: DEFAULT_EVENT_STATUS_FILTER,
    get allValues() {
      return ALL_EVENT_STATUS_OPTIONS
    },
  },
} as const

export const GENDER_FILTER_CONFIG = {
  storageKey: "admin-participants-filter-gender",
  matchMode: "custom_gender",
} as const

export const ORIENTATION_FILTER_CONFIG = {
  storageKey: "admin-participants-filter-orientation",
  matchMode: "custom_orientation",
} as const

export const flagStatusOptions: Array<{
  name: string
  value: ProfileFlagStatus
}> = Object.entries(profileFlagStatus).map(([value, name]) => ({
  name: name,
  label: name,
  value: value as ProfileFlagStatus,
}))

const participantSpotType: Record<string, string> = adminPropMapsCopy.spotType

export const participantSpotTypePropMap = (spot_type: string) => {
  return participantSpotType[spot_type] || ""
}

export const spotTypeOptions: Array<{
  name: string
  value: string
}> = Object.entries(participantSpotType).map(([value, name]) => ({
  name: name,
  label: name,
  value: value,
}))

function extractUniqueValues<T extends { [K in keyof T]: string[] | null }>(
  participants: T[],
  field: keyof T,
): string[] {
  const valuesSet = new Set<string>()

  participants.forEach((participant) => {
    const fieldValue = participant[field]
    if (Array.isArray(fieldValue)) {
      fieldValue.forEach((value) => {
        if (value && typeof value === "string") {
          valuesSet.add(value.toLowerCase())
        }
      })
    }
  })

  return Array.from(valuesSet).sort()
}

function buildFilterOptions(
  predefinedValues: readonly string[],
  extractedValues: string[],
): Array<{ name: string; value: string; label: string }> {
  const options: Array<{ name: string; value: string; label: string }> = []
  const seenLowercase = new Set<string>()
  const extractedSet = new Set(extractedValues)

  predefinedValues.forEach((value) => {
    const lowerValue = value.toLowerCase()
    if (extractedSet.has(lowerValue)) {
      seenLowercase.add(lowerValue)
      options.push({ name: value, value: lowerValue, label: value })
    }
  })

  extractedValues.forEach((lowerValue) => {
    if (!seenLowercase.has(lowerValue)) {
      seenLowercase.add(lowerValue)
      options.push({
        name: lowerValue,
        value: lowerValue,
        label: lowerValue,
      })
    }
  })

  return options
}

export const notesFilterOptions = [
  {
    value: "has-notes",
    label: adminPropMapsCopy.notesFilter.hasNotes,
    name: adminPropMapsCopy.notesFilter.hasNotes,
  },
  {
    value: "no-notes",
    label: adminPropMapsCopy.notesFilter.noNotes,
    name: adminPropMapsCopy.notesFilter.noNotes,
  },
]

export function genderFilterOptions(
  participants: Array<{ gender: string[] | null }>,
): Array<{ name: string; value: string; label: string }> {
  const extractedValues = extractUniqueValues(participants, "gender")
  return buildFilterOptions(GENDERS, extractedValues)
}

export function orientationFilterOptions(
  participants: Array<{ orientation: string[] | null }>,
): Array<{ name: string; value: string; label: string }> {
  const extractedValues = extractUniqueValues(participants, "orientation")
  return buildFilterOptions(ORIENTATIONS, extractedValues)
}
