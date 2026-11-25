import { redirect } from "react-router"
import { getUserContext } from "~/business/auth/auth.server"
import { canSeeLikert } from "~/business/profile/likert-answers.server"
import { getLikertSubmission } from "~/business/profile/likert-submissions.server"
import { Button } from "~/components/atoms/button/button"
import { LikertAnswerScale } from "~/components/molecules/likert-answer-scale/likert-answer-scale"
import { likertPageCopy as copy } from "~/copy/account"
import { metaCopy } from "~/copy/meta"
import { assertUuidParams } from "~/lib/helpers/assert-uuid-params"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { Route } from "./+types/likert-submission-page"

const {
  dash: {
    account: { ACCOUNT, LIKERT },
  },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.likert.title)
}

export async function loader({ request, params }: Route.LoaderArgs) {
  assertUuidParams(params.submissionId)

  const { currentProfile } = await getUserContext(request, params)
  if (!currentProfile || !(await canSeeLikert(currentProfile))) {
    return redirect(ACCOUNT)
  }

  const submission = await getLikertSubmission(
    params.submissionId,
    currentProfile,
  )

  // This page is the person's own history. An admin reading someone else's
  // answers does it from the participant's page instead.
  if (!submission || submission.profileId !== currentProfile.id) {
    return redirect(LIKERT)
  }

  return {
    submittedAt: submission.submittedAt.toISOString(),
    answers: submission.answers.map(({ statementText, answer, comment }) => ({
      statementText,
      answer,
      comment,
    })),
  }
}

const LikertSubmissionPage = ({ loaderData }: Route.ComponentProps) => {
  const { submittedAt, answers } = loaderData

  return (
    <>
      <h1>
        {copy.submissionTitle(formatDateTime(submittedAt).full ?? submittedAt)}
      </h1>

      <div className="flex flex-col gap-8">
        <ol className="flex flex-col gap-6">
          {answers.map(({ statementText, answer, comment }, index) => (
            <li
              key={index}
              className="flex flex-col gap-3 rounded-lg border p-4"
            >
              <p className="font-semibold">{statementText}</p>
              <LikertAnswerScale answer={answer} />
              {comment ? (
                <div className="border-l-2 pl-3 text-sm text-muted-foreground">
                  <p className="sr-only">{copy.commentLabel}</p>
                  <p>{comment}</p>
                </div>
              ) : null}
            </li>
          ))}
        </ol>

        <Button variant="outline" to={LIKERT}>
          {copy.backToHistory}
        </Button>
      </div>
    </>
  )
}

export default LikertSubmissionPage
