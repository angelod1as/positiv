import { useCallback, useMemo } from "react"
import { redirect, useNavigate } from "react-router"
import { getUserContext } from "~/business/auth/auth.server"
import { likertScaleCache } from "~/business/cms/likert-scale-cache.server"
import { canSeeLikert } from "~/business/profile/likert-answers.server"
import { Copy } from "~/components/atoms/copy/copy"
import { buildLikertFlow } from "~/components/forms/custom/likert/build-likert-flow"
import { buildLikertQuestions } from "~/components/forms/custom/likert/build-likert-questions"
import { commitJson } from "~/components/forms/runtime/commit-json"
import { FormRunner } from "~/components/forms/runtime/form-runner"
import { OneAtATime } from "~/components/forms/runtime/presentations/one-at-a-time"
import type { Answers } from "~/components/forms/runtime/question.types"
import { likertPageCopy as copy } from "~/copy/account"
import { metaCopy } from "~/copy/meta"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { CommitResult } from "~types/forms/commit.types"
import type { Route } from "./+types/likert-answer-page"

const {
  dash: {
    account: { ACCOUNT, LIKERT, LIKERT_COMMIT },
  },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.likert.title)
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { currentProfile } = await getUserContext(request, params)
  if (!currentProfile || !(await canSeeLikert(currentProfile))) {
    return redirect(ACCOUNT)
  }

  const scale = await likertScaleCache.get()

  return {
    statements: scale?.statements ?? null,
    profileId: currentProfile.id,
  }
}

function fingerprint(statements: { key: string; text: string }[]): string {
  let hash = 5381
  for (const char of JSON.stringify(statements)) {
    hash = ((hash << 5) + hash + char.charCodeAt(0)) | 0
  }
  return (hash >>> 0).toString(36)
}

const LikertAnswerPage = ({ loaderData }: Route.ComponentProps) => {
  const { statements, profileId } = loaderData
  const navigate = useNavigate()

  const questions = useMemo(
    () => buildLikertQuestions(statements ?? []),
    [statements],
  )

  const commit = useCallback(
    async (answers: Answers): Promise<CommitResult> =>
      commitJson(LIKERT_COMMIT, answers, (pathname) => void navigate(pathname)),
    [navigate],
  )

  // A draft kept against other statements, or other wording, would save
  // answers to questions the person was never asked.
  const draftScope = useMemo(
    () => `${profileId}:${fingerprint(statements ?? [])}`,
    [profileId, statements],
  )

  const flow = useMemo(
    () => buildLikertFlow(questions, commit),
    [questions, commit],
  )

  return (
    <>
      <h1>{copy.title}</h1>

      {statements ? (
        <>
          <Copy>{copy.answerIntro}</Copy>
          <FormRunner
            key={draftScope}
            questions={questions}
            flow={flow}
            presentation={OneAtATime}
            persistence={{ formId: "likert", scopeId: draftScope }}
            pendingLabel={copy.sending}
            onDone={() => {
              void navigate(LIKERT)
            }}
          />
        </>
      ) : (
        <Copy>{copy.unavailable}</Copy>
      )}
    </>
  )
}

export default LikertAnswerPage
