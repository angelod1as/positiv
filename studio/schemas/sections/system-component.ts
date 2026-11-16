import { CodeBlockIcon } from "@sanity/icons/CodeBlock"
import { defineField, defineType } from "sanity"

const components = [
  { title: "Botão: não registrar minhas visitas", value: "analyticsOptOut" },
]

export const systemComponent = defineType({
  name: "systemComponent",
  title: "Componente do sistema",
  description: "Bloco feito em código. Só escolha qual entra aqui.",
  type: "object",
  icon: CodeBlockIcon,
  fields: [
    defineField({
      name: "component",
      title: "Qual componente",
      type: "string",
      options: { list: components },
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { component: "component" },
    prepare: ({ component }) => ({
      title: "Componente do sistema",
      subtitle: components.find((option) => option.value === component)?.title,
    }),
  },
})
