// Relative imports, not the ~ alias: the Studio package imports this module
// across the package boundary to validate email copy, and its build cannot
// resolve ~.
import { unknownVariables } from "../cms/placeholders"
import { escapeHtml } from "../../lib/helpers/escape-html"

type InlineChild = {
  readonly _type?: string
  readonly text?: string
  readonly marks?: readonly string[]
}

type InlineBlock = {
  readonly _type?: string
  readonly children?: readonly InlineChild[]
}

const MARK_TAGS: Record<string, string> = { strong: "strong", em: "em" }

function renderSpan(child: InlineChild): string {
  // Only text spans render; a non-span inline object (no text) contributes
  // nothing, as the restricted email body never contains one.
  let html = escapeHtml(child.text ?? "")
  for (const mark of child.marks ?? []) {
    const tag = MARK_TAGS[mark]
    if (tag) html = `<${tag}>${html}</${tag}>`
  }
  return html
}

// Portable Text to inline HTML, one string per block. The block wrappers
// (<p>, <h1>) and their styling stay in the email layout; this only renders the
// marked-up text that goes inside them, with every span HTML-escaped.
export function renderInlineBlocks(
  blocks: readonly InlineBlock[] | undefined,
): string[] {
  return (blocks ?? [])
    .map((block) => (block.children ?? []).map(renderSpan).join(""))
    // Drop a block that renders to nothing — an Editor's stray Enter — so the
    // layout does not wrap an empty paragraph in a styled <p>.
    .filter((paragraph) => paragraph.trim() !== "")
}

// The placeholders left in the rendered HTML that the whitelist does not allow.
// Validating the rendered text, not the raw spans, is what catches a token
// split across spans with different marks — e.g. "{{" + bold "nome" + "}}",
// which renders as "{{<strong>nome</strong>}}" and would otherwise throw at
// send time after the Sanity read, past the point the fallback can cover.
export function unknownBlockVariables(
  blocks: readonly InlineBlock[] | undefined,
  whitelist: readonly string[],
): string[] {
  const unknown = new Set<string>()
  for (const paragraph of renderInlineBlocks(blocks)) {
    for (const name of unknownVariables(paragraph, whitelist)) {
      unknown.add(name)
    }
  }
  return [...unknown]
}
