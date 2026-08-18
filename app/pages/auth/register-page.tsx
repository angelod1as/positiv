import { Turnstile } from "@marsidev/react-turnstile"
import { useCallback, useMemo } from "react"
import { useLoaderData, useNavigate } from "react-router"
import { Link } from "~/components/atoms/link/link"
import { buildRegisterFlow } from "~/components/forms/custom/register/build-register-flow"
import { buildRegisterQuestions } from "~/components/forms/custom/register/build-register-questions"
import type { CommitResult } from "~types/forms/commit.types"
import { FormRunner } from "~/components/forms/runtime/form-runner"
import { AllAtOnce } from "~/components/forms/runtime/presentations/all-at-once"
import type { RenderQuestion } from "~/components/forms/runtime/presentations/presentation.types"
import type { Answers } from "~/components/forms/runtime/question.types"
import { renderQuestion as defaultRenderQuestion } from "~/components/forms/runtime/render-question"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { getTurnstileConfig } from "~/lib/helpers/get-turnstile-config.server"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import { cn } from "~/lib/utils"
import type { Route } from "./+types/register-page"
import { Copy } from "~/components/atoms/copy/copy"
import { registerCopy } from "~/copy/auth"
import { metaCopy } from "~/copy/meta"

const {
  auth: { LOGIN, LOGON_EMAIL_MESSAGE, REGISTER_COMMIT },
} = paths

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.register)
}

export const loader = async () => {
  const { siteKey } = getTurnstileConfig()
  return { turnstileSiteKey: siteKey }
}

const RegisterPage = ({}: Route.ComponentProps) => {
  const { turnstileSiteKey } = useLoaderData<typeof loader>()
  const navigate = useNavigate()

  const questions = useMemo(() => buildRegisterQuestions(), [])

  const commit = useCallback(async (answers: Answers): Promise<CommitResult> => {
    const response = await fetch(REGISTER_COMMIT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(answers),
    })

    return (await response.json()) as CommitResult
  }, [])

  const flow = useMemo(
    () => buildRegisterFlow(questions, commit),
    [questions, commit],
  )

  const renderQuestion = useCallback<RenderQuestion>(
    (args) => {
      if (args.question.id !== "captchaToken") return defaultRenderQuestion(args)

      return (
        <>
          <Turnstile
            siteKey={turnstileSiteKey}
            options={{ appearance: "always" }}
            onSuccess={(token) => args.onChange(token)}
            onExpire={() => args.onChange("")}
            onError={() => args.onChange("")}
          />
          {/* Mirrors the token the widget handed over, so the e2e run can see
              that it arrived — and hand one over itself on a run that cannot
              reach Cloudflare. Hidden through the attribute rather than
              type="hidden": React only tracks changes on text inputs, so a
              hidden-typed one would take a value without ever reporting it. */}
          <input
            hidden
            // Carries the question's id so that the label the presentation
            // draws for it points at a real control rather than at nothing.
            id={args.question.id}
            type="text"
            name="captchaToken"
            value={typeof args.value === "string" ? args.value : ""}
            onChange={(event) => args.onChange(event.target.value)}
          />
        </>
      )
    },
    [turnstileSiteKey],
  )

  return (
    <div className={cn("flex flex-col gap-6")}>
      <Card className="my-12">
        <CardHeader>
          <CardTitle className="text-2xl">{registerCopy.title}</CardTitle>
          <CardDescription>
            <Copy>{registerCopy.description}</Copy>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormRunner
            questions={questions}
            flow={flow}
            presentation={AllAtOnce}
            renderQuestion={renderQuestion}
            // No persistence, deliberately: the answers include two passwords,
            // and persistence writes them to sessionStorage.
            onDone={() => {
              void navigate(LOGON_EMAIL_MESSAGE)
            }}
          />
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            <Copy inline>{registerCopy.loginPrompt(LOGIN)}</Copy>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

export default RegisterPage
