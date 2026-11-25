import { RULES_ID } from "../../singletons"
import { markdownToLongPortableText, type Span } from "../../seed/markdown"

export type SourceBlock = {
  _type: "block"
  _key: string
  style: "normal" | "h2" | "h3" | "blockquote"
  listItem?: "bullet" | "number"
  level?: number
  markDefs: { _type: string; _key: string; href?: string }[]
  children: Span[]
}

type Rule = {
  _type: "rule"
  _key: string
  title: string
  body: SourceBlock[]
  highlight?: { title?: string; body: SourceBlock[] }
}

export type MarkdownSection = {
  heading: string
  body: string
  alert?: { title: string; body: string }
}

const opensWithEmoji = /^\p{Extended_Pictographic}/u

const textOf = (block: SourceBlock) =>
  block.children.map((span) => span.text).join("")

// A line break typed inside a paragraph is a paragraph of its own: the draft
// writes some rule titles that way, after the previous rule's last sentence.
function splitAtLineBreaks(block: SourceBlock): SourceBlock[] {
  const lines: Span[][] = [[]]

  for (const span of block.children) {
    span.text.split("\n").forEach((piece, index) => {
      if (index > 0) lines.push([])
      lines[lines.length - 1].push({ ...span, text: piece })
    })
  }

  return lines.map((children) => ({ ...block, children }))
}

function trimmed(block: SourceBlock): SourceBlock {
  const children = block.children.map((span, index, spans) => ({
    ...span,
    text:
      index === 0 && index === spans.length - 1
        ? span.text.trim()
        : index === 0
          ? span.text.trimStart()
          : index === spans.length - 1
            ? span.text.trimEnd()
            : span.text,
  }))

  return { ...block, children: children.filter((span) => span.text !== "") }
}

function keyed(block: SourceBlock, key: string): SourceBlock {
  return {
    ...block,
    _key: key,
    children: block.children.map((span, index) => ({
      ...span,
      _key: `${key}-s${index}`,
    })),
  }
}

export function splitIntoRules(blocks: SourceBlock[], prefix: string): Rule[] {
  const paragraphs = blocks
    .flatMap(splitAtLineBreaks)
    .map(trimmed)
    .filter((block) => block.children.length > 0)

  const rules: Rule[] = []

  for (const block of paragraphs) {
    const text = textOf(block)

    if (!block.listItem && opensWithEmoji.test(text)) {
      rules.push({
        _type: "rule",
        _key: `${prefix}-${rules.length + 1}`,
        title: text,
        body: [],
      })
      continue
    }

    const rule = rules[rules.length - 1]
    if (!rule) {
      throw new Error(
        `Texto antes do primeiro título de regra: "${text}". Comece cada regra com um título que abre com emoji.`,
      )
    }
    rule.body.push(keyed(block, `${rule._key}-b${rule.body.length}`))
  }

  return rules
}

// The application rules used #### for a subtitle; the rule text stops at h3.
const fromMarkdown = (markdown: string) =>
  markdownToLongPortableText(markdown.replace(/^#### /gm, "### "))

export function markdownSectionsToRules(
  sections: readonly MarkdownSection[],
  prefix: string,
): Rule[] {
  return sections.map((section, index) => ({
    _type: "rule",
    _key: `${prefix}-${index + 1}`,
    title: section.heading,
    body: fromMarkdown(section.body),
    ...(section.alert && {
      highlight: {
        title: section.alert.title,
        body: fromMarkdown(section.alert.body),
      },
    }),
  }))
}

// Written as a draft: the Rules go live when someone publishes them in the
// Studio, after reading them.
export function rulesDocument(parts: {
  generalRules: Rule[]
  agreements: Rule[]
  privateRules: Rule[]
}) {
  return { _id: `drafts.${RULES_ID}`, _type: "rules", ...parts }
}
