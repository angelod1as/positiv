import { defineArrayMember, defineType } from "sanity"

import { blockProblem, decorators, link } from "./rich-text"

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

export const contentProblem = blockProblem(
  "Só são permitidos parágrafos, títulos, subtítulos, citações e listas, com negrito, itálico e links",
)

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
