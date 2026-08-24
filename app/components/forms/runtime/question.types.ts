import type { ZodType } from "zod"

export type Option = {
  label: string
  value: string
}

export type InputSpec =
  | { kind: "text"; placeholder?: string }
  | { kind: "email"; placeholder?: string }
  /**
   * `autoComplete` tells a password manager sign-in from new account, so it
   * belongs to the question rather than to the kind.
   */
  | {
      kind: "password"
      autoComplete?: "current-password" | "new-password"
      placeholder?: string
    }
  /**
   * `prefix` and `suffix` are the unit the number is read in — a currency, a
   * count of people. They belong to the question rather than to the layout: the
   * number means something different without them.
   */
  | {
      kind: "textnumber"
      placeholder?: string
      prefix?: string
      suffix?: string
    }
  | { kind: "textarea"; placeholder?: string }
  | { kind: "date" }
  /**
   * A date and a time in one control. Distinct from `date`, which is the day
   * alone — an event that opens at eight in the morning is not the same answer
   * as the day it opens on.
   */
  | { kind: "datetime" }
  | { kind: "select"; options: Option[] }
  | { kind: "radio"; options: Option[] }
  | { kind: "checkbox"; options: Option[] }
  /**
   * A list answered with `string[]`, drawn as pills. With `allowOther` the
   * answer may also be something the list never offered, which arrives in the
   * same array — so a value loaded from elsewhere needs no unpacking.
   */
  | {
      kind: "chips"
      options: Option[]
      allowOther?: boolean
      otherPlaceholder?: string
    }
  /**
   * One box, answered `true` or `false` — `checkbox` is a list answered
   * `string[]`. The prompt is the text beside the box, so the presentation
   * leaves the label to the renderer.
   */
  | { kind: "boolean" }

export type Question = {
  id: string
  prompt: string
  help?: string
  input: InputSpec
  schema: ZodType
  /**
   * Runs after `schema` passes, with every answer in the run, for a question
   * whose validity depends on another — confirming a password, closing a date
   * range. Null means there is nothing to say.
   */
  refine?: (value: unknown, answers: Answers) => ValidationResult | null
}

export type Answers = Record<string, unknown>

export type ValidationResult = { ok: true } | { ok: false; message: string }
