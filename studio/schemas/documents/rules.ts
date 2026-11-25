import { BookIcon } from "@sanity/icons/Book"
import { defineArrayMember, defineField, defineType } from "sanity"

function rulesList(
  name: string,
  title: string,
  description: string,
  { optional = false } = {},
) {
  return defineField({
    name,
    title,
    description,
    type: "array",
    of: [defineArrayMember({ type: "rule" })],
    validation: (rule) => (optional ? rule : rule.required().min(1)),
  })
}

export const rules = defineType({
  name: "rules",
  title: "Regras",
  type: "document",
  icon: BookIcon,
  fields: [
    rulesList(
      "generalRules",
      "Regras Gerais",
      "Aparecem no site para todo mundo, onde houver um bloco Regras Gerais, e na candidatura aos eventos.",
    ),
    rulesList(
      "agreements",
      "Acordos",
      "Aparecem no site para todo mundo, onde houver um bloco Acordos, e na candidatura aos eventos.",
    ),
    rulesList(
      "privateRules",
      "Regras Privadas",
      "Só aparecem para quem entrou na conta: na candidatura aos eventos e onde houver um bloco Regras Privadas. Podem ficar vazias enquanto são escritas.",
      { optional: true },
    ),
  ],
  preview: {
    prepare: () => ({ title: "Regras" }),
  },
})
