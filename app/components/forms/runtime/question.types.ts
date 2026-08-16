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
  shuffleOptions?: boolean
}

export type Answers = Record<string, unknown>

export type ValidationResult = { ok: true } | { ok: false; message: string }
