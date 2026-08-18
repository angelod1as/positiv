import type { ZodType } from "zod"

export type Option = {
  label: string
  value: string
}

export type InputSpec =
  | { kind: "text" }
  | { kind: "textnumber" }
  | { kind: "textarea" }
  | { kind: "date" }
  | { kind: "select"; options: Option[] }
  | { kind: "radio"; options: Option[] }
  | { kind: "checkbox"; options: Option[] }

export type Question = {
  id: string
  prompt: string
  help?: string
  input: InputSpec
  schema: ZodType
  /**
   * Runs after `schema` passes, with every answer in the run. For a question
   * whose validity depends on another one — confirming a password, closing a
   * date range. Returning null means there is nothing to say.
   */
  refine?: (value: unknown, answers: Answers) => ValidationResult | null
}

export type Answers = Record<string, unknown>

export type ValidationResult = { ok: true } | { ok: false; message: string }
