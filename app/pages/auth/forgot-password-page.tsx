import { useCallback, useMemo } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { Copy } from "~/components/atoms/copy/copy"
import { buildForgotPasswordQuestions } from "~/components/forms/custom/forgot-password/build-forgot-password-questions"
import { FormRunner } from "~/components/forms/runtime/form-runner"
import { AllAtOnce } from "~/components/forms/runtime/presentations/all-at-once"
import type { Answers } from "~/components/forms/runtime/question.types"
import { buildSingleScreenFlow } from "~/components/forms/runtime/single-screen-flow"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { forgotPasswordCopy } from "~/copy/auth"
import { metaCopy } from "~/copy/meta"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { CommitResult } from "~types/forms/commit.types"
import type { Route } from "./+types/forgot-password-page"

const {
  auth: { LOGIN, FORGOT_PASSWORD_COMMIT },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.forgotPassword.title)
}

const ForgotPasswordPage = ({}: Route.ComponentProps) => {
  const navigate = useNavigate()

  const questions = useMemo(() => buildForgotPasswordQuestions(), [])

  const commit = useCallback(async (answers: Answers): Promise<CommitResult> => {
    const response = await fetch(FORGOT_PASSWORD_COMMIT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(answers),
    })

    return (await response.json()) as CommitResult
  }, [])

  const flow = useMemo(
    () => buildSingleScreenFlow(questions, commit),
    [questions, commit],
  )

  return (
    <>
      <Card className="my-12">
        <CardHeader>
          <CardTitle className="text-2xl">{forgotPasswordCopy.title}</CardTitle>{" "}
          <CardDescription>
            <p>{forgotPasswordCopy.description}</p>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormRunner
            questions={questions}
            flow={flow}
            presentation={AllAtOnce}
            continueLabel={forgotPasswordCopy.buttonLabel}
            pendingLabel={forgotPasswordCopy.pendingButtonLabel}
            onDone={() => {
              toast.success(forgotPasswordCopy.successToast, {
                duration: 10_000,
              })
              void navigate(LOGIN)
            }}
          />
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            <Copy inline>{forgotPasswordCopy.loginPrompt(LOGIN)}</Copy>
          </p>
        </CardFooter>
      </Card>
    </>
  )
}

export default ForgotPasswordPage
