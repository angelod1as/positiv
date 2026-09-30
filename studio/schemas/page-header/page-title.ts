import { TextIcon } from "@sanity/icons/Text"
import { defineField, defineType } from "sanity"

export const pageTitle = defineType({
  name: "pageTitle",
  title: "Título",
  description: "Só o título da página, com uma frase de introdução opcional",
  type: "object",
  icon: TextIcon,
  fields: [
    defineField({
      name: "title",
      title: "Título",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "intro",
      title: "Introdução",
      type: "string",
    }),
  ],
})
