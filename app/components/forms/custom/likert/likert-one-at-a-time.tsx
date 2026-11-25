import { useEffect, useRef } from "react"
import {
  LIKERT_CHOICES,
  type LikertAnswer,
} from "~/components/forms/runtime/likert"
import { OneAtATime } from "~/components/forms/runtime/presentations/one-at-a-time"
import type { Presentation } from "~/components/forms/runtime/presentations/presentation.types"

const isTyping = (target: HTMLElement) =>
  target.isContentEditable ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement ||
  (target instanceof HTMLInputElement &&
    target.type !== "radio" &&
    target.type !== "checkbox")

/**
 * One statement per screen, answered from the keyboard: 1 to 5 pick, Enter,
 * Space or the right arrow move on, the left arrow goes back. Inside the
 * comment the keys type as usual; Ctrl or Cmd + Enter moves on and Escape
 * leaves the box. Listens on the document, so the keys work with nothing
 * focused, and stands aside inside a dialog.
 */
export const LikertOneAtATime: Presentation = (props) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const { questions } = props
  const question = questions.length === 1 ? questions[0] : undefined
  const isLikert = question?.input.kind === "likert"

  // Read through a ref, so the listener is attached once rather than after
  // every answer.
  const latest = useRef({ ...props, question })
  useEffect(() => {
    latest.current = { ...props, question }
  })

  useEffect(() => {
    if (!isLikert) return

    const radio = (choice?: string) =>
      containerRef.current?.querySelector<HTMLInputElement>(
        choice
          ? `input[type="radio"][value="${choice}"]`
          : 'input[type="radio"]',
      )

    const onKeyDown = (event: KeyboardEvent) => {
      const {
        question,
        answers,
        isBusy,
        canGoBack,
        onAnswer,
        onContinue,
        onBack,
      } = latest.current
      if (!question || isBusy || event.defaultPrevented) return

      const target = event.target as HTMLElement
      if (target.closest?.('[role="dialog"], [role="alertdialog"]')) return

      if (isTyping(target)) {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault()
          onContinue()
        } else if (event.key === "Escape") {
          event.preventDefault()
          const current = answers[question.id] as
            | Partial<LikertAnswer>
            | undefined
          ;(radio(current?.choice) ?? radio())?.focus()
        }
        return
      }

      if (event.ctrlKey || event.metaKey || event.altKey) return

      const isControl = Boolean(target.closest?.("button, a"))
      const choice = /^[1-5]$/.test(event.key)
        ? LIKERT_CHOICES[Number(event.key) - 1]
        : undefined

      if (choice) {
        event.preventDefault()
        const current = (answers[question.id] ?? {}) as Partial<LikertAnswer>
        onAnswer(question.id, { ...current, choice })
        radio(choice)?.focus()
        return
      }

      if (event.repeat) return

      const isActivation = event.key === "Enter" || event.key === " "
      if (event.key === "ArrowRight" || (isActivation && !isControl)) {
        event.preventDefault()
        onContinue()
        return
      }

      if (event.key === "ArrowLeft" && canGoBack) {
        event.preventDefault()
        onBack()
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [isLikert])

  return (
    <div ref={containerRef}>
      <OneAtATime {...props} />
    </div>
  )
}
