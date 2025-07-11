import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import type {
  ParticipantApplicationStatus,
  ParticipantAttendanceStatus,
  ProfileApprovedToAttendStatus,
} from "~types/entities.types"

const isParticipantAcceptedInProcess = (
  participant: ProfileWithExtraData,
): boolean => {
  const allowedApplicationStatuses: ParticipantApplicationStatus[] = [
    "sent_payment_data",
    "sent_rules",
    "talking",
    "finalised",
  ]

  const allowedAttendanceStatuses: ParticipantAttendanceStatus[] = [
    "attended",
    "pending",
  ]

  const allowedApprovedToAttendStatuses: ProfileApprovedToAttendStatus[] = [
    "approved",
    "approved_with_reservations",
    "pending",
  ]

  return (
    allowedApplicationStatuses.includes(participant.application_status) &&
    allowedAttendanceStatuses.includes(participant.attendance_status) &&
    allowedApprovedToAttendStatuses.includes(participant.approved_to_attend)
  )
}

export const countParticipants = (participants: ProfileWithExtraData[]) => {
  return participants.reduce(
    (prev, curr) => {
      const { acceptedInProcess, applications } = prev
      const isAccepted = isParticipantAcceptedInProcess(curr)

      if (isAccepted) {
        acceptedInProcess.total = acceptedInProcess.total + 1
        if (curr.is_veteran) {
          acceptedInProcess.veterans = acceptedInProcess.veterans + 1
        } else {
          acceptedInProcess.rookies = acceptedInProcess.rookies + 1
        }
      }

      if (curr.is_veteran) {
        applications.veterans = applications.veterans + 1
      } else {
        applications.rookies = applications.rookies + 1
      }

      applications.total = applications.total + 1

      return prev
    },
    {
      applications: {
        total: 0,
        veterans: 0,
        rookies: 0,
      },
      acceptedInProcess: {
        total: 0,
        veterans: 0,
        rookies: 0,
      },
    },
  )
}
