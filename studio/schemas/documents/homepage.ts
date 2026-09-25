import { HomeIcon } from "@sanity/icons/Home"
import { defineField, defineType } from "sanity"

const sections = [
  { name: "hero", title: "Destaque" },
  { name: "nextEvents", title: "Próximos eventos" },
  { name: "about", title: "Como assim?" },
  { name: "testimonials", title: "Depoimentos" },
  { name: "ctaBanner", title: "Chamada para os eventos" },
  { name: "founders", title: "Quem faz a Positiv" },
  { name: "feedback", title: "Feedback" },
]

export const homepage = defineType({
  name: "homepage",
  title: "Página inicial",
  type: "document",
  icon: HomeIcon,
  fields: sections.map(({ name, title }) =>
    defineField({
      name,
      title,
      type: name,
      options: { collapsible: true, collapsed: true },
      validation: (rule) => rule.required(),
    }),
  ),
  preview: {
    prepare: () => ({ title: "Página inicial" }),
  },
})
