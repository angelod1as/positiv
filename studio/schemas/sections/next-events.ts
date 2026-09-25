import { CalendarIcon } from "@sanity/icons/Calendar"
import { defineField, defineType } from "sanity"

export const nextEvents = defineType({
  name: "nextEvents",
  title: "Próximos eventos",
  description:
    "Os eventos em si vêm da plataforma; aqui ficam só o título, o subtítulo e quantos mostrar",
  type: "object",
  icon: CalendarIcon,
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
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "count",
      title: "Quantos eventos mostrar",
      description: "De 1 a 6",
      type: "number",
      initialValue: 3,
      validation: (rule) => rule.required().integer().min(1).max(6),
    }),
  ],
})
