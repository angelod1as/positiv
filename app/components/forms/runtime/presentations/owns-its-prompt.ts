import type { Question } from "~/components/forms/runtime/question.types"

/**
 * Whether the question's own control draws the prompt. A boolean is a box with
 * its prompt beside it, so a presentation that also drew a label would name the
 * same control twice — and must not point `labelledBy` at a heading it skipped.
 *
 * Shared rather than repeated per presentation: the two have to agree, and a
 * second kind that draws its own prompt would otherwise reach only one of them.
 */
export const ownsItsPrompt = (question: Question) =>
  question.input.kind === "boolean"
