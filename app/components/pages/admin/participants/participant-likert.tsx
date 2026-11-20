import type { ParticipantLikert as ParticipantLikertData } from "~/business/profile/participant-likert.server"
import { Link } from "~/components/atoms/link/link"
import { LIKERT_CHOICES } from "~/components/forms/runtime/likert"
import { Card, CardContent } from "~/components/ui/card"
import { adminParticipantsCopy } from "~/copy/admin/participants"
import { likertCopy } from "~/copy/forms"
import { formatDateTime } from "~/lib/helpers/format-date-time"

const copy = adminParticipantsCopy.likert

type ParticipantLikertProps = {
  likert: ParticipantLikertData | null
}

const answerLabel = (answer: number) => {
  const choice = LIKERT_CHOICES[answer - 1]
  return choice ? likertCopy.choices[choice] : String(answer)
}

const Body = ({ likert }: ParticipantLikertProps) => {
  if (!likert) return <p>{copy.loadFailed}</p>
  if (likert.submissions.length === 0) return <p>{copy.neverAnswered}</p>

  const { submissions, selected } = likert

  return (
    <div className="space-y-4">
      {selected && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {copy.submittedAt(
              formatDateTime(selected.submittedAt.toISOString()).full ?? "",
            )}
          </p>
          <ol aria-label={copy.answers} className="space-y-3">
            {selected.answers.map((answer) => (
              <li key={answer.statementKey} className="space-y-1">
                <p>{answer.statementText}</p>
                <p className="font-semibold">{answerLabel(answer.answer)}</p>
                <p className="text-sm text-muted-foreground italic">
                  {answer.comment ?? copy.noComment}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
      <nav aria-label={copy.submissions}>
        <h4>{copy.submissions}</h4>
        <ul className="space-y-1">
          {submissions.map(({ id, submittedAt }) => (
            <li key={id}>
              <Link
                to={`?envio=${id}`}
                preventScrollReset
                aria-current={id === selected?.id ? "page" : undefined}
                className="aria-[current=page]:font-semibold"
              >
                {formatDateTime(submittedAt.toISOString(), "numeric").full}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

export const ParticipantLikert = ({ likert }: ParticipantLikertProps) => (
  <Card className="py-4">
    <CardContent className="space-y-4">
      <h3>{copy.title}</h3>
      <Body likert={likert} />
    </CardContent>
  </Card>
)
