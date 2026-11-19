import { defineArrayMember, defineType } from "sanity"

import { blockProblem, decorators, link } from "./rich-text"

export const calloutTextProblem = blockProblem(
  "Só são permitidos parágrafos e listas, com negrito, itálico e links",
)

export const calloutText = defineType({
  name: "calloutText",
  title: "Texto do callout",
  type: "array",
  validation: (rule) => rule.custom(calloutTextProblem),
  of: [
    defineArrayMember({
      type: "block",
      styles: [{ title: "Parágrafo", value: "normal" }],
      lists: [
        { title: "Lista com marcadores", value: "bullet" },
        { title: "Lista numerada", value: "number" },
      ],
      marks: { decorators, annotations: [link] },
    }),
  ],
})
