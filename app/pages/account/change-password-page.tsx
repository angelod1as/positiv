import { useCallback, useMemo } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { getUserContext } from "~/business/auth/auth.server"
import { buildChangePasswordQuestions } from "~/components/forms/custom/change-password/build-change-password-questions"
import { FormRunner } from "~/components/forms/runtime/form-runner"
import { AllAtOnce } from "~/components/forms/runtime/presentations/all-at-once"
import type { Answers } from "~/components/forms/runtime/question.types"
import { buildSingleScreenFlow } from "~/components/forms/runtime/single-screen-flow"
import { changePasswordCopy } from "~/copy/account"
import { metaCopy } from "~/copy/meta"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { CommitResult } from "~types/forms/commit.types"
import type { Route } from "./+types/change-password-page"

const {
  dash: {
    account: { ACCOUNT, CHANGE_PASSWORD_COMMIT },
  },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.changePassword.title)
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await getUserContext(request, params)
  return {}
}

const ChangePasswordPage = ({}: Route.ComponentProps) => {
  const navigate = useNavigate()

  const questions = useMemo(() => buildChangePasswordQuestions(), [])

  const commit = useCallback(
    async (answers: Answers): Promise<CommitResult> => {
      const response = await fetch(CHANGE_PASSWORD_COMMIT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      })

      // A session that expired mid-form is answered with a redirect, which
      // fetch follows to a page of HTML. Reading that as JSON would only say
      // the change failed, when what someone needs is to sign in again.
      if (response.redirected) {
        void navigate(new URL(response.url).pathname)
        return { ok: false, errors: [] }
      }

      return (await response.json()) as CommitResult
    },
    [navigate],
  )

  const flow = useMemo(
    () => buildSingleScreenFlow(questions, commit),
    [questions, commit],
  )

  return (
    <div className="flex flex-col w-full max-w-md gap-8">
      <div>
        <h1>{changePasswordCopy.title}</h1>
        <p className="text-muted-foreground">
          {changePasswordCopy.description}
        </p>
      </div>

      <FormRunner
        questions={questions}
        flow={flow}
        presentation={AllAtOnce}
        continueLabel={changePasswordCopy.buttonLabel}
        pendingLabel={changePasswordCopy.pendingButtonLabel}
        // No persistence, deliberately: the answers are two passwords, and
        // persistence writes them to sessionStorage.
        onDone={() => {
          toast.success(changePasswordCopy.successToast, { duration: 10_000 })
          void navigate(ACCOUNT)
        }}
      />
    </div>
  )
}

export default ChangePasswordPage
