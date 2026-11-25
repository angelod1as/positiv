import type { RenderQuestion } from "~/components/forms/runtime/presentations/presentation.types"
import { renderQuestion as defaultRenderQuestion } from "~/components/forms/runtime/render-question"
import { emailConsentCopy } from "~/copy/emails"

/**
 * Draws a box the way the runtime would, and adds the warning right below the
 * alerts box once it is unticked, before anything is saved.
 */
export const renderEmailConsentQuestion: RenderQuestion = (args) => {
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
}
