import { useEffect, useRef } from "react"
import { Error } from "~/components/forms/base/error"
import { formRuntimeCopy } from "~/copy/forms"

type RejectionNoticeProps = {
  /** The runtime's signal that an advance was refused, and by which questions. */
  rejection: { questionIds: string[] } | null
  errors: Record<string, string>
}

/**
 * Says beside the button that the form refused to move on, and takes focus to
 * the first question that refused it. A screen showing many questions at once
 * draws each message under its own field, which is no use when the field is
 * off screen and the person is looking at the button they just clicked.
 *
 * The question is found through `data-question-id` on whatever the presentation
 * wraps it in, because a radio or checkbox group carries the question's id on
 * no control at all — see `render-question.tsx`.
 *
 * Focus is keyed on the signal's identity rather than on the errors, so it
 * moves once per refusal and never yanks anyone away mid-correction.
 */
export const RejectionNotice = ({
  rejection,
  errors,
}: RejectionNoticeProps) => {
  const noticeRef = useRef<HTMLDivElement>(null)
  const errorsRef = useRef(errors)

  useEffect(() => {
    errorsRef.current = errors
  })

  useEffect(() => {
    if (!rejection) return

    const first = rejection.questionIds.find((id) => errorsRef.current[id])
    if (!first) return

    // The form this notice sits in, so that two forms asking the same question
    // on one page each keep their own focus.
    const scope = noticeRef.current?.closest("form") ?? document

    const field = scope.querySelector<HTMLElement>(
      `[data-question-id="${CSS.escape(first)}"]`,
    )

    // Buttons count: a question answered with pills has no input of its own
    // unless it also takes free text, and landing on nothing would leave
    // someone at the bottom of the screen with no idea where to look.
    field?.querySelector<HTMLElement>("input, select, textarea, button")?.focus()
  }, [rejection])

  const standing = rejection?.questionIds.some((id) => errors[id]) ?? false
  if (!standing) return null

  return (
    <Error ref={noticeRef} role="alert">
      {formRuntimeCopy.fieldsRejected}
    </Error>
  )
}
