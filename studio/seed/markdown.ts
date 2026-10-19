export type Span = {
  _type: "span"
  _key: string
  text: string
  marks: string[]
}

export type MarkDef = { _type: "link"; _key: string; href: string }

export type LongRichTextBlock = {
  _type: "block"
  _key: string
  style: "normal" | "h2" | "h3" | "blockquote"
  listItem?: "bullet" | "number"
  level?: number
  markDefs: MarkDef[]
  children: Span[]
}

function inline(text: string, blockKey: string) {
  const children: Span[] = []
  const markDefs: MarkDef[] = []
  let plain = ""
  let spanIndex = 0
  let linkIndex = 0
  let rest = text

  const flushPlain = () => {
    if (plain === "") {
      return
    }

    children.push({
      _type: "span",
      _key: `${blockKey}s${spanIndex++}`,
      text: plain,
      marks: [],
    })
    plain = ""
  }

  while (rest.length > 0) {
    const link = rest.match(/^\[([^\]]+)\]\(([^)]+)\)/)
    const strong = rest.match(/^\*\*([^*]+)\*\*/)
    const em = rest.match(/^\*([^*]+)\*/)

    if (link) {
      flushPlain()
      const key = `${blockKey}l${linkIndex++}`
      markDefs.push({ _type: "link", _key: key, href: link[2] })
      children.push({
        _type: "span",
        _key: `${blockKey}s${spanIndex++}`,
        text: link[1],
        marks: [key],
      })
      rest = rest.slice(link[0].length)
    } else if (strong) {
      flushPlain()
      children.push({
        _type: "span",
        _key: `${blockKey}s${spanIndex++}`,
        text: strong[1],
        marks: ["strong"],
      })
      rest = rest.slice(strong[0].length)
    } else if (em) {
      flushPlain()
      children.push({
        _type: "span",
        _key: `${blockKey}s${spanIndex++}`,
        text: em[1],
        marks: ["em"],
      })
      rest = rest.slice(em[0].length)
    } else {
      plain += rest[0]
      rest = rest.slice(1)
    }
  }

  flushPlain()

  return { children, markDefs }
}

export function markdownToLongPortableText(
  markdown: string,
): LongRichTextBlock[] {
  const blocks: LongRichTextBlock[] = []
  let paragraph: string[] = []

  const emit = (
    text: string,
    style: LongRichTextBlock["style"],
    listItem?: LongRichTextBlock["listItem"],
  ) => {
    const key = `b${blocks.length}`
    const { children, markDefs } = inline(text, key)

    blocks.push({
      _type: "block",
      _key: key,
      style,
      markDefs,
      children,
      ...(listItem ? { listItem, level: 1 } : {}),
    })
  }

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return
    }

    emit(paragraph.join(" "), "normal")
    paragraph = []
  }

  for (const line of markdown.split("\n")) {
    if (line.trim() === "") {
      flushParagraph()
      continue
    }

    if (line.startsWith("### ")) {
      flushParagraph()
      emit(line.slice(4), "h3")
      continue
    }

    if (line.startsWith("## ")) {
      flushParagraph()
      emit(line.slice(3), "h2")
      continue
    }

    if (line.startsWith("> ")) {
      flushParagraph()
      emit(line.slice(2), "blockquote")
      continue
    }

    if (line.startsWith("- ")) {
      flushParagraph()
      emit(line.slice(2), "normal", "bullet")
      continue
    }

    const numbered = line.match(/^\d+\.\s+(.*)$/)

    if (numbered) {
      flushParagraph()
      emit(numbered[1], "normal", "number")
      continue
    }

    paragraph.push(line)
  }

  flushParagraph()

  return blocks
}
