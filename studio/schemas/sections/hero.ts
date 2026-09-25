import { StarIcon } from "@sanity/icons/Star"
import { defineField, defineType } from "sanity"

export const hero = defineType({
  name: "hero",
  title: "Destaque",
  description: "A primeira coisa que aparece na página",
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
      validation: (rule) => rule.required(),
    }),
  ],
})
