import { useCallback, useMemo } from "react"
import { redirect, useNavigate } from "react-router"
import { getUserContext } from "~/business/auth/auth.server"
import { likertScaleCache } from "~/business/cms/likert-scale-cache.server"
import { canSeeLikert } from "~/business/profile/likert-answers.server"
import { Copy } from "~/components/atoms/copy/copy"
import { buildLikertFlow } from "~/components/forms/custom/likert/build-likert-flow"
import { buildLikertQuestions } from "~/components/forms/custom/likert/build-likert-questions"
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
  if (!(await canSeeLikert(currentProfile))) return redirect(ACCOUNT)

  const scale = await likertScaleCache.get()

  return {
    statements: scale?.statements ?? null,
    profileId: currentProfile?.id ?? "",
  }
}

const LikertAnswerPage = ({ loaderData }: Route.ComponentProps) => {
  const { statements, profileId } = loaderData
  const navigate = useNavigate()

  const questions = useMemo(
    () => buildLikertQuestions(statements ?? []),
    [statements],
  )

  const commit = useCallback(async (answers: Answers): Promise<CommitResult> => {
    const response = await fetch(LIKERT_COMMIT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(answers),
    })
    return (await response.json()) as CommitResult
  }, [])

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
            // Keyed by the person: the runtime seeds its answers once, at mount.
            key={profileId}
            questions={questions}
            flow={flow}
            presentation={OneAtATime}
            // The draft clears once the save lands, so answering again always
            // starts blank.
            persistence={{ formId: "likert", scopeId: profileId }}
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
