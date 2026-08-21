import { Turnstile } from "@marsidev/react-turnstile"
import { useCallback, useMemo } from "react"
import { useLoaderData, useNavigate } from "react-router"
import { toast } from "sonner"
import { buildFeedbackQuestions } from "~/components/forms/custom/feedback/build-feedback-questions"
import { FormRunner } from "~/components/forms/runtime/form-runner"
import { AllAtOnce } from "~/components/forms/runtime/presentations/all-at-once"
import type { RenderQuestion } from "~/components/forms/runtime/presentations/presentation.types"
import type { Answers } from "~/components/forms/runtime/question.types"
import { renderQuestion as defaultRenderQuestion } from "~/components/forms/runtime/render-question"
import { buildSingleScreenFlow } from "~/components/forms/runtime/single-screen-flow"
import { Card, CardContent } from "~/components/ui/card"
import { metaCopy } from "~/copy/meta"
import { publicCopy } from "~/copy/public"
import { getTurnstileConfig } from "~/lib/helpers/get-turnstile-config.server"
import { createMetaArray } from "~/lib/helpers/meta"
import paths from "~/lib/paths"
import type { CommitResult } from "~types/forms/commit.types"
import type { Route } from "./+types/feedback-page"

const feedbackCopy = publicCopy.feedback

const {
  root: { HOME, FEEDBACK_COMMIT },
} = paths

// Built once, outside the component: the runtime reads the seed on its first
// render, and an object written inline would be a new one every time.
const EMPTY_CAPTCHA = { captchaToken: "" }

export function meta({}: Route.MetaArgs) {
  return createMetaArray(metaCopy.feedback.title)
}

export const loader = async () => {
  const { siteKey } = getTurnstileConfig()
  return { turnstileSiteKey: siteKey }
}

const FeedbackPage = () => {
  const { turnstileSiteKey } = useLoaderData<typeof loader>()
  const navigate = useNavigate()

  const questions = useMemo(() => buildFeedbackQuestions(), [])

  const commit = useCallback(async (answers: Answers): Promise<CommitResult> => {
    const response = await fetch(FEEDBACK_COMMIT, {
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
    <div className="flex flex-col gap-6 my-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{feedbackCopy.title}</h1>
        <p className="text-sm text-muted-foreground">{feedbackCopy.subtitle}</p>
        <Card className="bg-muted/50 mt-2">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{feedbackCopy.scope}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {feedbackCopy.parties}
            </p>
          </CardContent>
        </Card>
      </div>

      <FormRunner
        questions={questions}
        flow={flow}
        presentation={AllAtOnce}
        renderQuestion={renderQuestion}
        // The captcha opens as an empty answer rather than as no answer at
        // all, so a form sent before the widget replies is refused in the
        // captcha's own words instead of the shared "required" copy.
        initialAnswers={EMPTY_CAPTCHA}
        continueLabel={feedbackCopy.submit}
        pendingLabel={feedbackCopy.submitting}
        onDone={() => {
          toast.success(feedbackCopy.success)
          void navigate(HOME)
        }}
      />
    </div>
  )
}

export default FeedbackPage
