import { BillIcon } from "@sanity/icons/Bill"
import { defineField, defineType } from "sanity"
import { unknownVariableProblem as unknownVariableProblemIn } from "../placeholder-validation"

export const PAYMENT_MESSAGE_VARIABLES = [
  "link",
  "data",
  "nome",
  "evento",
  "formas",
] as const

export function unknownVariableProblem(value: string | undefined) {
  return unknownVariableProblemIn(value, PAYMENT_MESSAGE_VARIABLES)
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
