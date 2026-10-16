import { BillIcon } from "@sanity/icons/Bill"
import { defineField, defineType } from "sanity"

export const PAYMENT_MESSAGE_VARIABLES = [
  "link",
  "data",
  "nome",
  "evento",
  "formas",
] as const

const variablePattern = /\{\{\s*(\w+)\s*\}\}/g

export function unknownVariableProblem(value: string | undefined) {
  const unknown = [...(value ?? "").matchAll(variablePattern)]
    .map((match) => match[1])
    .find(
      (name) =>
        !(PAYMENT_MESSAGE_VARIABLES as readonly string[]).includes(name),
    )

  return unknown
    ? `Variável desconhecida: {{${unknown}}}. Use apenas ${PAYMENT_MESSAGE_VARIABLES.map(
        (name) => `{{${name}}}`,
      ).join(", ")}.`
    : true
}

export const paymentMessages = defineType({
  name: "paymentMessages",
  title: "Mensagens de pagamento",
  type: "document",
  icon: BillIcon,
  fields: [
    defineField({
      name: "whatsappMessage",
      title: "Mensagem de WhatsApp",
      description:
        "A mensagem copiada no painel para enviar o link de pagamento. Variáveis: {{link}} (link de pagamento), {{data}} (data de vencimento), {{nome}} (nome da pessoa), {{evento}} (nome do evento), {{formas}} (formas de pagamento e valores). Texto puro — o WhatsApp não formata Markdown.",
      type: "text",
      rows: 10,
      validation: (rule) => rule.required().custom(unknownVariableProblem),
    }),
  ],
  preview: {
    prepare: () => ({ title: "Mensagens de pagamento" }),
  },
})
