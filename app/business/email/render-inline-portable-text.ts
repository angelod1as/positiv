import { escapeHtml } from "~/lib/helpers/escape-html"

type InlineSpan = {
  readonly _type?: string
  readonly text: string
  readonly marks?: readonly string[]
}

type InlineBlock = {
  readonly _type?: string
  readonly children?: readonly InlineSpan[]
}

// Only the decorators the email copy is allowed to use. A mark that is not one
// of these — a link annotation key, say — leaves the text unwrapped rather than
// emitting a tag the layout did not plan for.
const MARK_TAGS: Record<string, string> = { strong: "strong", em: "em" }

function renderSpan(span: InlineSpan): string {
  let html = escapeHtml(span.text)
  for (const mark of span.marks ?? []) {
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
  return (blocks ?? []).map((block) =>
    (block.children ?? []).map(renderSpan).join(""),
  )
}
