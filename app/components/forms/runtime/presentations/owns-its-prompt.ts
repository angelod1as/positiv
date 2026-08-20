import type { Question } from "~/components/forms/runtime/question.types"

/**
 * Whether the question's own control draws the prompt. A boolean is a box with
 * its prompt beside it, so a presentation drawing a label too would name the
 * same control twice. Shared because both presentations have to agree.
 */
export const ownsItsPrompt = (question: Question) =>
  question.input.kind === "boolean"
