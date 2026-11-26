import { BookIcon } from "@sanity/icons/Book"
import { defineArrayMember, defineField, defineType } from "sanity"

function rulesPart(
  name: string,
  description: string,
  { optional = false } = {},
) {
  return [
    defineField({
      name: `${name}Title`,
      title: "Título",
      description:
        "Aparece acima destas regras, no site e na candidatura. Opcional.",
      type: "string",
      fieldset: name,
    }),
    defineField({
      name: `${name}Subtitle`,
      title: "Subtítulo",
      description: "Aparece logo abaixo do título. Opcional.",
      type: "string",
      fieldset: name,
    }),
    defineField({
      name,
      title: "Regras",
      description,
      type: "array",
      of: [defineArrayMember({ type: "rule" })],
      fieldset: name,
      validation: (rule) => (optional ? rule : rule.required().min(1)),
    }),
  ]
}

export const rules = defineType({
  name: "rules",
  title: "Regras",
  type: "document",
  icon: BookIcon,
  fieldsets: [
    { name: "generalRules", title: "Regras Gerais" },
    { name: "agreements", title: "Acordos" },
    { name: "privateRules", title: "Regras Privadas" },
  ],
  fields: [
    ...rulesPart(
      "generalRules",
      "Aparecem no site para todo mundo, onde houver um bloco Regras Gerais, e na candidatura aos eventos.",
    ),
    ...rulesPart(
      "agreements",
      "Aparecem no site para todo mundo, onde houver um bloco Acordos, e na candidatura aos eventos.",
    ),
    ...rulesPart(
      "privateRules",
      "Só aparecem para quem entrou na conta: na candidatura aos eventos e onde houver um bloco Regras Privadas. Podem ficar vazias enquanto são escritas.",
      { optional: true },
    ),
  ],
  preview: {
    prepare: () => ({ title: "Regras" }),
  },
})
