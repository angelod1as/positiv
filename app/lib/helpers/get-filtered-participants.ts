import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import {
  type ParticipantApplicationStatus,
  type ParticipantAttendanceStatus,
  type ProfileApprovedToAttendStatus,
} from "~types/database/entities.types"

export const getWillGoToEventParticipants = (
  participants: ProfileWithExtraData[],
) => {
  const willGo = participants.filter((participant) => {
    const notAttendance: ParticipantAttendanceStatus[] = [
      "skipped",
      "will-not-go",
    ]
    const notApplication: ParticipantApplicationStatus[] = [
      "pending",
      "talking",
      "think_better",
    ]
    const notApproved: ProfileApprovedToAttendStatus[] = ["pending", "rejected"]
    if (
      notAttendance.includes(participant.attendance_status) ||
      notApplication.includes(participant.application_status) ||
      notApproved.includes(participant.approved_to_attend)
    ) {
      return false
    }

    return true
  })

  return { participants: willGo, count: willGo.length }
}
