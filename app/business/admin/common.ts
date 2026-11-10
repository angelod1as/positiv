import { adminParticipantsCopy } from "~/copy/admin/participants"
import { zod } from "~/lib/helpers/zod"
import {
  profileApprovedToAttendStatusEnum,
  profileFlagStatusEnum,
} from "~types/database/entities.types"
import { userContextSchema } from "../common"
import { parseBoolean } from "../application/application-schemas"

export const adminContextSchema = userContextSchema.extend({
  eventId: zod.string().optional(),
})

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
