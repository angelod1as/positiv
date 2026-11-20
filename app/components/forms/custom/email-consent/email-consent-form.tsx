import { useCallback, useMemo } from "react"
import type { EmailPreferences } from "~/business/newsletter/email-preferences-schema"
import { Copy } from "~/components/atoms/copy/copy"
import type { CommitFn } from "~/components/forms/runtime/commit.types"
import { FormRunner } from "~/components/forms/runtime/form-runner"
import { AllAtOnce } from "~/components/forms/runtime/presentations/all-at-once"
import type { RenderQuestion } from "~/components/forms/runtime/presentations/presentation.types"
import { renderQuestion as defaultRenderQuestion } from "~/components/forms/runtime/render-question"
import { buildSingleScreenFlow } from "~/components/forms/runtime/single-screen-flow"
import { emailConsentCopy } from "~/copy/emails"
import { buildEmailConsentQuestions } from "./build-email-consent-questions"

type EmailConsentFormProps = {
  initialPreferences: EmailPreferences
  commit: CommitFn
  onDone: () => void
}

/**
 * The email permissions, one component wherever they are asked: the "Seus
 * e-mails" page and the terms (WEB-54). Saving with nothing changed still
 * commits: seeing the choices and saving is confirming them.
 */
export const EmailConsentForm = ({
  initialPreferences,
  commit,
  onDone,
}: EmailConsentFormProps) => {
  const questions = useMemo(() => buildEmailConsentQuestions(), [])
  const flow = useMemo(
    () => buildSingleScreenFlow(questions, commit),
    [questions, commit],
  )

  const renderQuestion = useCallback<RenderQuestion>((args) => {
    const control = defaultRenderQuestion(args)
    if (args.question.id !== "registrationAlerts" || args.value !== false) {
      return control
    }

    return (
      <>
        {control}
        <p role="status" className="text-sm text-destructive">
          {emailConsentCopy.alertsOffWarning}
        </p>
      </>
    )
  }, [])

  return (
    <div className="flex flex-col gap-8">
      <div className="text-muted-foreground">
        <Copy>{emailConsentCopy.alwaysSent}</Copy>
      </div>
      <FormRunner
        questions={questions}
        flow={flow}
        presentation={AllAtOnce}
        renderQuestion={renderQuestion}
        initialAnswers={initialPreferences}
        continueLabel={emailConsentCopy.save}
        pendingLabel={emailConsentCopy.saving}
        onDone={onDone}
      />
    </div>
  )
}
