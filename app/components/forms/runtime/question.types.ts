import type { ZodType } from "zod"

export type Option = {
  label: string
  value: string
}

export type InputSpec =
  | { kind: "text"; placeholder?: string }
  | { kind: "email"; placeholder?: string }
  /**
   * `autoComplete` is what tells a password manager whether it is looking at a
   * sign-in or at a new account, so it belongs to the question, not the kind.
   */
  | {
      kind: "password"
      autoComplete?: "current-password" | "new-password"
      placeholder?: string
    }
  | { kind: "textnumber"; placeholder?: string }
  | { kind: "textarea"; placeholder?: string }
  | { kind: "date" }
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
   * One box, answered with `true` or `false`. Distinct from `checkbox`, which
   * is a list of options answered with `string[]`. The prompt is the text
   * beside the box, so the presentation leaves the label to the renderer.
   */
  | { kind: "boolean" }

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
