type Span = { _type: "span"; _key: string; text: string; marks: string[] }
type Link = { _type: "link"; _key: string; href: string }
type Block = {
  _type: "block"
  _key: string
  style: "normal"
  markDefs: Link[]
  children: Span[]
}

const inline = /\*\*(.+?)\*\*|(?<!\w)_(.+?)_(?!\w)|\[(.+?)\]\((.+?)\)/g

function toBlock(paragraph: string, blockIndex: number): Block {
  const key = `b${blockIndex}`
  const markDefs: Link[] = []
  const children: Span[] = []

  const addSpan = (text: string, marks: string[]) => {
    if (text) {
      children.push({
        _type: "span",
        _key: `${key}s${children.length}`,
        text,
        marks,
      })
    }
  }

  let cursor = 0

  for (const match of paragraph.matchAll(inline)) {
    const [whole, strong, em, linkText, href] = match

    addSpan(paragraph.slice(cursor, match.index), [])

    if (strong !== undefined) {
      addSpan(strong, ["strong"])
    } else if (em !== undefined) {
      addSpan(em, ["em"])
    } else {
      const link: Link = {
        _type: "link",
        _key: `${key}l${markDefs.length}`,
        href,
      }
      markDefs.push(link)
      addSpan(linkText, [link._key])
    }

    cursor = match.index + whole.length
  }

  addSpan(paragraph.slice(cursor), [])

  return { _type: "block", _key: key, style: "normal", markDefs, children }
}

export function markdownToPortableText(markdown: string): Block[] {
  return markdown
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(toBlock)
}
