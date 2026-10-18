import { EnvelopeIcon } from "@sanity/icons/Envelope"
import {
  defineArrayMember,
  defineField,
  defineType,
  type PortableTextBlock,
} from "sanity"

import { PAYMENT_LINK_MAIL_VARIABLES } from "../../../app/business/email/payment-link-mail.variables"
import { decorators } from "../objects/rich-text"
import { unknownVariableProblem } from "../placeholder-validation"

const tokenList = (variables: readonly string[]) =>
  variables.map((name) => `{{${name}}}`).join(", ")

export const emailTemplates = defineType({
  name: "emailTemplates",
  title: "E-mails",
  type: "document",
  icon: EnvelopeIcon,
  fields: [
    defineField({
      name: "paymentLink",
      title: "E-mail de pagamento",
      type: "object",
      description:
        "O texto editável do e-mail enviado quando o admin abre uma cobrança. O layout, o rodapé, os preços e as datas ficam no código — aqui vai só a redação. Use as variáveis entre chaves para os dados dinâmicos; o valor é preenchido pela plataforma.",
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: "subject",
          title: "Assunto",
          description: `O assunto do e-mail. Variáveis: ${tokenList(
            PAYMENT_LINK_MAIL_VARIABLES.subject,
          )} (nome do evento).`,
          type: "string",
          validation: (rule) =>
            rule
              .required()
              .custom((value: string | undefined) =>
                unknownVariableProblem(value, PAYMENT_LINK_MAIL_VARIABLES.subject),
              ),
        }),
        defineField({
          name: "heading",
          title: "Título",
          description: "O título grande no topo do e-mail. Sem variáveis.",
          type: "string",
          validation: (rule) =>
            rule
              .required()
              .custom((value: string | undefined) =>
                unknownVariableProblem(value, PAYMENT_LINK_MAIL_VARIABLES.heading),
              ),
        }),
        defineField({
          name: "body",
          title: "Corpo",
          description: `Os parágrafos de abertura. Negrito e itálico; sem links. Variáveis: ${tokenList(
            PAYMENT_LINK_MAIL_VARIABLES.body,
          )} (nome da pessoa, nome do evento).`,
          type: "array",
          of: [
            defineArrayMember({
              type: "block",
              styles: [{ title: "Parágrafo", value: "normal" }],
              lists: [],
              marks: { decorators, annotations: [] },
            }),
          ],
          validation: (rule) =>
            rule
              .required()
              .custom((value: PortableTextBlock[] | undefined) =>
                unknownVariableProblem(value, PAYMENT_LINK_MAIL_VARIABLES.body),
              ),
        }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: "E-mails" }),
  },
})
