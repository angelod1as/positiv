import { defineArrayMember, defineType, type PortableTextBlock } from "sanity"

import { decorators, isAllowed, link } from "./rich-text"

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
