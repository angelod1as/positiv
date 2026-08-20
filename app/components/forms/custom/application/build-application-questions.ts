import { z } from "zod"
import { applyToEventSchema } from "~/business/common"
import type {
  InputSpec,
  Question,
} from "~/components/forms/runtime/question.types"
import { eventApplicationCopy } from "~/copy/events"

const { labels, descriptions } = eventApplicationCopy

/**
 * The order the form has always drawn: the schema's, minus the two fields the
 * server fills in for itself.
 */
const ASKED = ["referrals", "referred", "companions", "bond", "notes"] as const

type Asked = (typeof ASKED)[number]

const bondInput = (): InputSpec => {
  const bond = applyToEventSchema.shape.bond.removeDefault()

  return {
    kind: "radio",
    options: bond.options.map((answer) => ({ label: answer, value: answer })),
  }
}

export function buildApplicationQuestions(): Question[] {
  return ASKED.map((id: Asked) => ({
    id,
    prompt: labels[id],
    help: descriptions[id],
    schema: applyToEventSchema.shape[id] as z.ZodType,
    input: id === "bond" ? bondInput() : { kind: "textarea" },
  }))
}
