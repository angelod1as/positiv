import { useState } from "react"
import type { RejectedEventParticipant } from "~/business/admin/admin.server"
import { Link } from "~/components/atoms/link/link"
import { adminEventsCopy } from "~/copy/admin/events"
import paths from "~/lib/paths"

const {
  admin: { ADMIN_VIEW_PARTICIPANT },
} = paths

function formatName(participant: RejectedEventParticipant): string {
  if (participant.social_name && participant.full_name) {
    return `${participant.social_name} (${participant.full_name})`
  }
  return (
    participant.social_name ??
    participant.full_name ??
    adminEventsCopy.rejectedParticipants.noName
  )
}

export function RejectedParticipantsSection({
  participants,
}: {
  participants: RejectedEventParticipant[]
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (participants.length === 0) {
    return null
  }

  const text = adminEventsCopy.rejectedParticipants.summary(participants.length)

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls="rejected-participants-list"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>{isExpanded ? "▼" : "▶"}</span>
        <span>{text}</span>
      </button>
      {isExpanded && (
        <ul
          id="rejected-participants-list"
          className="mt-2 ml-6 space-y-1 text-sm"
        >
          {participants.map((p) => (
            <li key={p.profile_id}>
              <Link to={ADMIN_VIEW_PARTICIPANT(p.profile_id)}>
                {formatName(p)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
