import { defineField, defineType } from "sanity"

import { contentProblem } from "./long-rich-text"

export const rule = defineType({
  name: "rule",
  title: "Regra",
  type: "object",
  fields: [
    defineField({
      name: "title",
      title: "Título",
      description: "Com os emojis, como aparece no site",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "body",
      title: "Texto",
      type: "longRichText",
      validation: (rule) => rule.required().custom(contentProblem),
    }),
    defineField({
      name: "highlight",
      title: "Destaque",
      description: "Opcional. Um quadro em destaque logo depois do texto",
      type: "object",
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({ name: "title", title: "Título", type: "string" }),
        defineField({
          name: "body",
          title: "Texto",
          type: "longRichText",
          validation: (rule) =>
            rule
              .custom(contentProblem)
              .custom((body, context) => {
                const highlight = context.parent as
                  | { title?: string }
                  | undefined
                return highlight?.title && !body
                  ? "Escreva o texto do destaque ou apague o título"
                  : true
              }),
        }),
      ],
    }),
  ],
  preview: { select: { title: "title" } },
})
