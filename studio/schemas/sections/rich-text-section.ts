import { TextIcon } from "@sanity/icons/Text"
import { defineField, defineType } from "sanity"

import { contentProblem } from "../objects/long-rich-text"

export const richTextSection = defineType({
  name: "richTextSection",
  title: "Texto",
  description:
    "Um texto longo, com títulos, listas e citações, como o código de conduta",
  type: "object",
  icon: TextIcon,
  fields: [
    defineField({
      name: "title",
      title: "Título",
      description: "Opcional",
      type: "string",
    }),
    defineField({
      name: "body",
      title: "Texto",
      type: "longRichText",
      validation: (rule) => rule.required().custom(contentProblem),
    }),
  ],
  preview: {
    select: { title: "title" },
    prepare: ({ title }) => ({ title: title ?? "Texto" }),
  },
})
