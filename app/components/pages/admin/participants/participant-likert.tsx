import type { LikertSubmissionSummary } from "~/business/profile/participant-likert.server"
import { Badge } from "~/components/ui/badge"
import { Link } from "~/components/atoms/link/link"
import { Card, CardContent } from "~/components/ui/card"
import { adminParticipantsCopy } from "~/copy/admin/participants"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import paths from "~/lib/paths"

const {
  admin: { ADMIN_VIEW_LIKERT_SUBMISSION },
} = paths

const copy = adminParticipantsCopy.likert

type ParticipantLikertProps = {
  likert: LikertSubmissionSummary[] | null
  profileId: string
  eventId?: string | null
}

const Body = ({ likert, profileId, eventId }: ParticipantLikertProps) => {
  if (!likert) return <p>{copy.loadFailed}</p>
  if (likert.length === 0) return <p>{copy.neverAnswered}</p>

  return (
    <ul className="divide-y">
      {likert.map(({ id, submittedAt }, index) => (
        <li key={id} className="flex items-center gap-3 py-2">
          <span>{formatDateTime(submittedAt.toISOString(), "numeric").full}</span>
          {index === 0 && <Badge variant="secondary">{copy.latest}</Badge>}
          <Link
            to={ADMIN_VIEW_LIKERT_SUBMISSION(profileId, id, eventId)}
            className="ml-auto text-sm"
          >
            {copy.open}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export const ParticipantLikert = (props: ParticipantLikertProps) => (
  <Card className="py-4">
    <CardContent className="space-y-2">
      <h3>{copy.title}</h3>
      <Body {...props} />
    </CardContent>
  </Card>
)
