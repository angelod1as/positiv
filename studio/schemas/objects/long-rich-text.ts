import {
  defineArrayMember,
  defineType,
  isPortableTextSpan,
  isPortableTextTextBlock,
  type PortableTextBlock,
} from "sanity"

import { decorators, link } from "./rich-text"

const styles = [
  { title: "Parágrafo", value: "normal" },
  { title: "Título", value: "h2" },
  { title: "Subtítulo", value: "h3" },
  { title: "Citação", value: "blockquote" },
]

const lists = [
  { title: "Lista com marcadores", value: "bullet" },
  { title: "Lista numerada", value: "number" },
]

const decoratorValues = decorators.map((decorator) => decorator.value)

function isAllowed(block: PortableTextBlock) {
  if (block._type !== "block" || !isPortableTextTextBlock(block)) {
    return false
  }

  const annotationKeys = (block.markDefs ?? [])
    .filter((markDef) => markDef._type === "link")
    .map((markDef) => markDef._key)

  return block.children.every(
    (child) =>
      isPortableTextSpan(child) &&
      (child.marks ?? []).every(
        (mark) =>
          decoratorValues.includes(mark) || annotationKeys.includes(mark),
      ),
  )
}

export function contentProblem(blocks: PortableTextBlock[] | undefined) {
  const block = blocks?.find((candidate) => !isAllowed(candidate))

  return block
    ? {
        message:
          "Só são permitidos parágrafos, títulos, subtítulos, citações e listas, com negrito, itálico e links",
        path: [{ _key: block._key }],
      }
    : true
}

export const longRichText = defineType({
  name: "longRichText",
  title: "Texto longo",
  type: "array",
  validation: (rule) => rule.custom(contentProblem),
  of: [
    defineArrayMember({
      type: "block",
      styles,
      lists,
      marks: { decorators, annotations: [link] },
    }),
  ],
})
