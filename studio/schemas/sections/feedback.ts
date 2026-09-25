import { EnvelopeIcon } from "@sanity/icons/Envelope"
import { defineField, defineType } from "sanity"

export const feedback = defineType({
  name: "feedback",
  title: "Feedback",
  type: "object",
  icon: EnvelopeIcon,
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
    defineField({
      name: "ctaLabel",
      title: "Texto do botão",
      type: "string",
      validation: (rule) => rule.required(),
    }),
  ],
})
