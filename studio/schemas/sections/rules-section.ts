import { BookIcon } from "@sanity/icons/Book"
import { defineField, defineType } from "sanity"

import { type RulePart, ruleParts } from "../../../app/business/cms/rule-parts"

const partTitles: Record<RulePart, string> = {
  generalRules: "Regras Gerais",
  agreements: "Acordos",
  privateRules: "Regras Privadas",
}

const partSubtitles: Record<RulePart, string> = {
  generalRules: "Para todo mundo",
  agreements: "Para todo mundo",
  privateRules: "Só para quem entrou na conta",
}

export const rulesSection = defineType({
  name: "rulesSection",
  title: "Regras",
  description:
    "Uma das partes das Regras, editadas em Regras no menu. As Regras Privadas só aparecem para quem entrou na conta.",
  type: "object",
  icon: BookIcon,
  fields: [
    defineField({
      name: "part",
      title: "Qual parte",
      type: "string",
      options: {
        list: ruleParts.map((value) => ({ title: partTitles[value], value })),
        layout: "radio",
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "title",
      title: "Título",
      description: "Aparece acima das regras. Opcional.",
      type: "string",
    }),
    defineField({
      name: "subtitle",
      title: "Subtítulo",
      description: "Aparece logo abaixo do título. Opcional.",
      type: "string",
    }),
  ],
  preview: {
    select: { part: "part" },
    prepare: ({ part }) => ({
      title: partTitles[part as RulePart] ?? "Regras",
      subtitle: partSubtitles[part as RulePart],
    }),
  },
})
