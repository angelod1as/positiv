import { SplitVerticalIcon } from "@sanity/icons/SplitVertical"
import { defineArrayMember, defineField, defineType } from "sanity"

export const sideBySide = defineType({
  name: "sideBySide",
  title: "Lado-a-lado",
  description:
    "De 2 a 4 blocos lado a lado; no celular, um por linha. Por enquanto, só Callouts",
  type: "object",
  icon: SplitVerticalIcon,
  fields: [
    defineField({
      name: "title",
      title: "Título",
      description: "Opcional",
      type: "string",
    }),
    defineField({
      name: "items",
      title: "Blocos",
      type: "array",
      of: [defineArrayMember({ type: "callout" })],
      validation: (rule) => [
        rule
          .required()
          .min(2)
          .error("Use pelo menos 2 blocos; para um só, use um Callout"),
        rule.max(4).error("No máximo 4 blocos lado a lado"),
      ],
    }),
  ],
  preview: {
    select: { title: "title", items: "items" },
    prepare: ({ title, items }) => ({
      title: title || "Lado-a-lado",
      subtitle: `Lado-a-lado, ${Array.isArray(items) ? items.length : 0} blocos`,
    }),
  },
})
