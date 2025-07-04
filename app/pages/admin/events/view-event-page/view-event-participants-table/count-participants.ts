import type { ProfileWithExtraData } from "~/business/admin/admin.server"
import type { ParticipantApplicationStatus } from "~types/entities.types"

const isParticipantAccepted = (participant: ProfileWithExtraData) => {
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
      const { accepted, applications } = prev
      const isAccepted = isParticipantAccepted(curr)
      if (isAccepted) {
        accepted.total = accepted.total + 1
        if (curr.is_veteran) {
          accepted.veterans = accepted.veterans + 1
        } else {
          accepted.rookies = accepted.rookies + 1
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
      accepted: {
        total: 0,
        veterans: 0,
        rookies: 0,
      },
    },
  )
}
