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
 * the first question that refused. A screen of many questions draws each message
 * under its own field, which is no use when the field is off screen.
 *
 * The question is found through `data-question-id` on whatever wraps it, because
 * a radio or checkbox group carries the id on no control at all.
 *
 * Focus is keyed on the signal rather than on the errors, so it moves once per
 * refusal and never yanks anyone away mid-correction.
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

    // The form this notice sits in, so two forms on one page keep their own.
    const scope = noticeRef.current?.closest("form") ?? document

    const field = scope.querySelector<HTMLElement>(
      `[data-question-id="${CSS.escape(first)}"]`,
    )

    // Buttons count: a question answered with pills has no input of its own
    // unless it also takes free text, and landing on nothing leaves someone
    // with nowhere to look.
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
