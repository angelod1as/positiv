import { RocketIcon } from "@sanity/icons/Rocket"
import { defineField, defineType } from "sanity"

export const ctaBanner = defineType({
  name: "ctaBanner",
  title: "Chamada para os eventos",
  description: "O botão muda sozinho conforme a pessoa está logada ou não",
  type: "object",
  icon: RocketIcon,
  fields: [
    defineField({
      name: "title",
      title: "Título",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "body",
      title: "Texto",
      type: "richText",
      validation: (rule) => rule.required(),
    }),
  ],
})
