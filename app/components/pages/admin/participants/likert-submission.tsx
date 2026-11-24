import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import type { LikertSubmission as LikertSubmissionData } from "~/business/profile/likert-submissions.server"
import { Link } from "~/components/atoms/link/link"
import { LIKERT_CHOICES } from "~/components/forms/runtime/likert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { adminParticipantsCopy } from "~/copy/admin/participants"
import { likertCopy } from "~/copy/forms"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import paths from "~/lib/paths"

const {
  admin: {
    ADMIN_VIEW_PARTICIPANT,
    ADMIN_VIEW_LIKERT_SUBMISSION,
    events: { ADMIN_EVENT_VIEW_PARTICIPANT },
  },
} = paths

const copy = adminParticipantsCopy.likertSubmission

type LikertSubmissionProps = {
  profileId: string
  name: string
  eventId: string | null
  submission: LikertSubmissionData
  newerId: string | null
  olderId: string | null
}

const answerLabel = (answer: number) => {
  const choice = LIKERT_CHOICES[answer - 1]
  return choice ? likertCopy.choices[choice] : String(answer)
}

export const LikertSubmission = ({
  profileId,
  name,
  eventId,
  submission,
  newerId,
  olderId,
}: LikertSubmissionProps) => {
  const backHref = eventId
    ? ADMIN_EVENT_VIEW_PARTICIPANT(eventId, profileId)
    : ADMIN_VIEW_PARTICIPANT(profileId)

  return (
    <div className="space-y-6">
      <Link to={backHref} className="inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" aria-hidden />
        {copy.back}
      </Link>

      <div className="space-y-1">
        <h2>{copy.title(name)}</h2>
        <p className="text-sm text-muted-foreground">
          {copy.submittedAt(
            formatDateTime(submission.submittedAt.toISOString()).full ?? "",
          )}
        </p>
      </div>

      <nav className="flex justify-between gap-4 text-sm">
        {olderId ? (
          <Link
            to={ADMIN_VIEW_LIKERT_SUBMISSION(profileId, olderId, eventId)}
            className="inline-flex items-center gap-1"
          >
            <ChevronLeft className="size-4" aria-hidden />
            {copy.older}
          </Link>
        ) : (
          <span />
        )}
        {newerId && (
          <Link
            to={ADMIN_VIEW_LIKERT_SUBMISSION(profileId, newerId, eventId)}
            className="inline-flex items-center gap-1"
          >
            {copy.newer}
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        )}
      </nav>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/2">{copy.statement}</TableHead>
            <TableHead>{copy.answer}</TableHead>
            <TableHead>{copy.comment}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submission.answers.map((answer) => (
            <TableRow key={answer.statementKey}>
              <TableCell className="whitespace-normal align-top">
                {answer.statementText}
              </TableCell>
              <TableCell className="align-top font-semibold">
                {answerLabel(answer.answer)}
              </TableCell>
              <TableCell className="whitespace-normal align-top text-muted-foreground">
                {answer.comment ?? copy.noComment}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
