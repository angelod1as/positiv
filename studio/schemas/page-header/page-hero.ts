import { StarIcon } from "@sanity/icons/Star"
import { defineField, defineType } from "sanity"

import { richTextProblem } from "../objects/rich-text"

export const pageHero = defineType({
  name: "pageHero",
  title: "Destaque",
  description:
    "Um destaque menor que o da página inicial, para as outras páginas",
  type: "object",
  icon: StarIcon,
  fields: [
    defineField({
      name: "title",
      title: "Título",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "subtitle",
      title: "Subtítulo",
      type: "richText",
      validation: (rule) => rule.required().custom(richTextProblem),
    }),
  ],
})
