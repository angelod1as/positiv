import { HomeIcon } from "@sanity/icons/Home"
import { defineField, defineType } from "sanity"

export const homepageHero = defineType({
  name: "homepageHero",
  title: "Destaque da página inicial",
  description:
    "O grande destaque do topo da página inicial. Só pode ser usado nela.",
  type: "object",
  icon: HomeIcon,
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
