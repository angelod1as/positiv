import {
  isPortableTextSpan,
  isPortableTextTextBlock,
  type PortableTextBlock,
} from "sanity"

export type PlaceholderValue = string | PortableTextBlock[] | undefined

// The copy fields are either plain text or Portable Text; flatten both to the
// text an unknown-variable scan runs over. Blocks are joined with a newline so
// a {{token}} is never fabricated by concatenating two spans end to end.
export function placeholderText(value: PlaceholderValue): string {
  if (value === undefined) return ""
  if (typeof value === "string") return value
  return value
    .filter(isPortableTextTextBlock)
    .map((block) =>
      block.children
        .filter(isPortableTextSpan)
        .map((span) => span.text)
        .join(""),
    )
    .join("\n")
}

// Any {{...}} token, mirroring the app renderer, so a malformed token is
// rejected on publish rather than published with its braces intact.
const variablePattern = /\{\{([^{}]*)\}\}/g

export function unknownVariableProblem(
  value: PlaceholderValue,
  whitelist: readonly string[],
) {
  const unknown = [...placeholderText(value).matchAll(variablePattern)]
    .map((match) => match[1].trim())
    .find((name) => !whitelist.includes(name))

  return unknown === undefined
    ? true
    : `Variável desconhecida: {{${unknown}}}. Use apenas ${whitelist
        .map((name) => `{{${name}}}`)
        .join(", ")}.`
}
