import { HelpCircleIcon } from "@sanity/icons/HelpCircle"
import { defineArrayMember, defineField, defineType } from "sanity"

export const about = defineType({
  name: "about",
  title: "Como assim?",
  description: "Explica o que é um evento da Positiv",
  type: "object",
  icon: HelpCircleIcon,
  fields: [
    defineField({
      name: "title",
      title: "Título",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "cards",
      title: "Cartões",
      description: "Sempre três",
      type: "array",
      of: [
        defineArrayMember({
          name: "aboutCard",
          title: "Cartão",
          type: "object",
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
        }),
      ],
      validation: (rule) => rule.required().length(3),
    }),
  ],
})
