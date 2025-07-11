import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import type { ParticipantApplicationStatus } from "~types/entities.types"

const isParticipantAcceptedInProcess = (participant: ProfileWithExtraData) => {
  const arr: ParticipantApplicationStatus[] = [
    "sent_payment_data",
    "sent_rules",
    "finalised",
  ]
  return arr.includes(participant.application_status)
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
