import { adminParticipantsCopy } from "~/copy/admin/participants"
import { zod } from "~/lib/helpers/zod"
import {
  participantApplicationStatusEnum,
  participantAttendanceStatusEnum,
  profileApprovedToAttendStatusEnum,
  profileFlagStatusEnum,
} from "~types/database/entities.types"
import { userContextSchema } from "../common"

export const adminContextSchema = userContextSchema.extend({
  eventId: zod.string().optional(),
})

const spotTypeEnum = zod.enum(["regular", "social", "staff"])

export const updateParticipantVsEventSchema = zod.object({
  profile_id: zod.string().uuid(),
  event_id: zod.string().uuid(),
  intent: zod.literal("participant-vs-event-schema"),
  attendance_status: participantAttendanceStatusEnum,
  application_status: participantApplicationStatusEnum,
  spot_type: spotTypeEnum,
  was_selected_for_rotation: zod.boolean(),
  admin_general_notes: zod.string(),
})

const parseBoolean = zod.union([
  zod.literal("true").transform(() => true),
  zod.literal("false").transform(() => false),
  zod.boolean(),
])

export const updateEventParticipantByIdSchema = zod.object({
  id: zod.string().uuid(),
  profile_id: zod.string().uuid(),
  attendance_status: participantAttendanceStatusEnum.optional(),
  application_status: participantApplicationStatusEnum.optional(),
  spot_type: spotTypeEnum.optional(),
  is_veteran: parseBoolean.optional(),
  was_selected_for_rotation: parseBoolean.optional(),
  flag: profileFlagStatusEnum.optional(),
  flag_notes: zod.string().nullable().optional(),
  notes: zod.string().optional(),
  admin_general_notes: zod.string().optional(),
  companions: zod.string().optional(),
  approved_to_attend: profileApprovedToAttendStatusEnum.optional(),
}).refine(
  (data) => {
    // If flag is provided and not "none", flag_notes must be provided
    if (data.flag && data.flag !== "none") {
      return data.flag_notes !== null && data.flag_notes !== undefined && data.flag_notes.trim().length > 0
    }
    return true
  },
  {
    message: adminParticipantsCopy.adminNotes.flagNotesRequired,
    path: ["flag_notes"],
  }
)

export const updateProfileApprovalStatusSchema = zod.object({
  intent: zod.literal("update-profile-approval-status"),
  profile_id: zod.string().uuid(),
  approved_to_attend: profileApprovedToAttendStatusEnum,
})

export const updateProfileAdminNotesSchema = zod
  .object({
    intent: zod.literal("update-profile-admin-notes"),
    profile_id: zod.string().uuid(),
    flag: profileFlagStatusEnum.optional(),
    flag_notes: zod.string().nullable().optional(),
    general_notes: zod.string().nullable().optional(),
    is_veteran: parseBoolean.optional(),
    approved_to_attend: profileApprovedToAttendStatusEnum.optional(),
  })
  .refine(
    (data) => {
      // If flag is provided and not "none", flag_notes must be provided
      if (data.flag && data.flag !== "none") {
        return (
          data.flag_notes !== null &&
          data.flag_notes !== undefined &&
          data.flag_notes.trim().length > 0
        )
      }
      return true
    },
    {
      message: adminParticipantsCopy.adminNotes.flagNotesRequired,
      path: ["flag_notes"],
    }
  )
