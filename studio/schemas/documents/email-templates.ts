import { EnvelopeIcon } from "@sanity/icons/Envelope"
import {
  defineArrayMember,
  defineField,
  defineType,
  type PortableTextBlock,
} from "sanity"

import { APPLICATION_MAIL_VARIABLES } from "../../../app/business/email/application-mail.variables"
import { PAYMENT_CONFIRMED_MAIL_VARIABLES } from "../../../app/business/email/payment-confirmed-mail.variables"
import { PAYMENT_LINK_MAIL_VARIABLES } from "../../../app/business/email/payment-link-mail.variables"
import { PAYMENT_REFUND_MAIL_VARIABLES } from "../../../app/business/email/payment-refund-mail.variables"
import { REGISTRATION_LIMIT_ADMIN_MAIL_VARIABLES } from "../../../app/business/email/registration-limit-admin-mail.variables"
import {
  renderInlineBlocks,
  unknownBlockVariables,
} from "../../../app/business/email/render-inline-portable-text"
import { decorators } from "../objects/rich-text"
import { unknownVariableProblem } from "../placeholder-validation"

const tokenList = (variables: readonly string[]) =>
  variables.map((name) => `{{${name}}}`).join(", ")

const subjectField = (variables: readonly string[], help: string) =>
  defineField({
    name: "subject",
    title: "Assunto",
    description: `O assunto do e-mail. Variáveis: ${tokenList(variables)} (${help}).`,
    type: "string",
    validation: (rule) =>
      rule.required().max(150).custom((value: string | undefined) => {
        if (value && /[\r\n]/.test(value)) {
          return "O assunto não pode ter quebras de linha."
        }
        if (value !== undefined && value.trim().length === 0) {
          return "O assunto não pode ficar em branco."
        }
        return unknownVariableProblem(value, variables)
      }),
  })

// A single line of plain text: a heading or a button label.
const lineField = ({
  name,
  title,
  description,
  blank,
  variables = [],
}: {
  name: string
  title: string
  description: string
  blank: string
  variables?: readonly string[]
}) =>
  defineField({
    name,
    title,
    description,
    type: "string",
    validation: (rule) =>
      rule.required().custom((value: string | undefined) => {
        if (value !== undefined && value.trim().length === 0) {
          return blank
        }
        return unknownVariableProblem(value, variables)
      }),
  })

// Paragraphs of rich text, bold and italic only, one rendered block each.
const proseField = ({
  name,
  title,
  description,
  empty,
  variables,
}: {
  name: string
  title: string
  description: string
  empty: string
  variables: readonly string[]
}) =>
  defineField({
    name,
    title,
    description,
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
      rule.required().custom((value: PortableTextBlock[] | undefined) => {
        if (renderInlineBlocks(value).length === 0) {
          return empty
        }
        // Validate the rendered text, the same bytes the email renderer
        // produces, so a token split across spans is rejected here.
        const unknown = unknownBlockVariables(value, variables)
        return unknown.length === 0
          ? true
          : `Variável desconhecida: {{${unknown[0]}}}. Use apenas ${variables
              .map((variable) => `{{${variable}}}`)
              .join(", ")}.`
      }),
  })

const ctaField = lineField({
  name: "cta",
  title: "Botão",
  description: "O texto do botão. O link fica no código. Sem variáveis.",
  blank: "O botão não pode ficar em branco.",
})

const headingField = lineField({
  name: "heading",
  title: "Título",
  description: "O título grande no topo do e-mail. Sem variáveis.",
  blank: "O título não pode ficar em branco.",
})

export const emailTemplates = defineType({
  name: "emailTemplates",
  title: "E-mails",
  type: "document",
  icon: EnvelopeIcon,
  fields: [
    defineField({
      name: "application",
      title: "E-mail de candidatura recebida",
      type: "object",
      description:
        "O texto editável do e-mail enviado quando a pessoa se candidata a um evento. O layout, os detalhes do evento e o rodapé ficam no código — aqui vai só a redação.",
      options: { collapsible: true, collapsed: true },
      fields: [
        subjectField(APPLICATION_MAIL_VARIABLES.subject, "nome do evento"),
        headingField,
        proseField({
          name: "body",
          title: "Corpo",
          description: `Os parágrafos de abertura. Negrito e itálico; sem links. Variáveis: ${tokenList(
            APPLICATION_MAIL_VARIABLES.body,
          )} (nome da pessoa, nome do evento).`,
          empty: "O corpo precisa de pelo menos um parágrafo com texto.",
          variables: APPLICATION_MAIL_VARIABLES.body,
        }),
        lineField({
          name: "importantHeading",
          title: "Título dos avisos",
          description: "O subtítulo da seção de avisos. Sem variáveis.",
          blank: "O título dos avisos não pode ficar em branco.",
        }),
        lineField({
          name: "importantLead",
          title: "Introdução dos avisos",
          description: "A frase antes da lista de avisos. Sem variáveis.",
          blank: "A introdução dos avisos não pode ficar em branco.",
        }),
        proseField({
          name: "notes",
          title: "Avisos",
          description:
            "A lista de avisos: cada parágrafo vira um item. Negrito e itálico; sem links. Sem variáveis.",
          empty: "Os avisos precisam de pelo menos um item com texto.",
          variables: APPLICATION_MAIL_VARIABLES.notes,
        }),
      ],
    }),
    defineField({
      name: "paymentConfirmed",
      title: "E-mail de pagamento confirmado",
      type: "object",
      description:
        "O texto editável do e-mail enviado quando o pagamento é confirmado. O layout, o resumo do pagamento e o rodapé ficam no código — aqui vai só a redação.",
      options: { collapsible: true, collapsed: true },
      fields: [
        subjectField(PAYMENT_CONFIRMED_MAIL_VARIABLES.subject, "nome do evento"),
        headingField,
        proseField({
          name: "body",
          title: "Corpo",
          description: `Os parágrafos de abertura. Negrito e itálico; sem links. Variáveis: ${tokenList(
            PAYMENT_CONFIRMED_MAIL_VARIABLES.body,
          )} (nome da pessoa, nome do evento).`,
          empty: "O corpo precisa de pelo menos um parágrafo com texto.",
          variables: PAYMENT_CONFIRMED_MAIL_VARIABLES.body,
        }),
        ctaField,
        proseField({
          name: "closing",
          title: "Encerramento",
          description:
            "Os parágrafos depois do botão. Negrito e itálico; sem links. Sem variáveis.",
          empty: "O encerramento precisa de pelo menos um parágrafo com texto.",
          variables: PAYMENT_CONFIRMED_MAIL_VARIABLES.closing,
        }),
      ],
    }),
    defineField({
      name: "paymentLink",
      title: "E-mail de pagamento",
      type: "object",
      description:
        "O texto editável do e-mail enviado quando o admin abre uma cobrança. O layout, o rodapé, os preços e as datas ficam no código — aqui vai só a redação. Use as variáveis entre chaves para os dados dinâmicos; o valor é preenchido pela plataforma.",
      options: { collapsible: true, collapsed: false },
      fields: [
        subjectField(PAYMENT_LINK_MAIL_VARIABLES.subject, "nome do evento"),
        headingField,
        proseField({
          name: "body",
          title: "Corpo",
          description: `Os parágrafos de abertura. Negrito e itálico; sem links. Variáveis: ${tokenList(
            PAYMENT_LINK_MAIL_VARIABLES.body,
          )} (nome da pessoa, nome do evento).`,
          empty: "O corpo precisa de pelo menos um parágrafo com texto.",
          variables: PAYMENT_LINK_MAIL_VARIABLES.body,
        }),
      ],
    }),
    defineField({
      name: "paymentRefund",
      title: "E-mail de reembolso",
      type: "object",
      description:
        "O texto editável do e-mail enviado quando um reembolso é confirmado. O layout, o resumo do reembolso, o prazo de cada forma de pagamento e o rodapé ficam no código — aqui vai só a redação.",
      options: { collapsible: true, collapsed: true },
      fields: [
        subjectField(PAYMENT_REFUND_MAIL_VARIABLES.subject, "nome do evento"),
        headingField,
        proseField({
          name: "body",
          title: "Corpo",
          description: `Os parágrafos de abertura. Negrito e itálico; sem links. Variáveis: ${tokenList(
            PAYMENT_REFUND_MAIL_VARIABLES.body,
          )} (nome da pessoa, nome do evento).`,
          empty: "O corpo precisa de pelo menos um parágrafo com texto.",
          variables: PAYMENT_REFUND_MAIL_VARIABLES.body,
        }),
        ctaField,
      ],
    }),
    defineField({
      name: "registrationLimit",
      title: "E-mail de limite de candidaturas (para admins)",
      type: "object",
      description:
        "O texto editável do e-mail enviado aos admins quando um evento atinge o limite de candidaturas. O layout, os detalhes do evento e o rodapé ficam no código — aqui vai só a redação.",
      options: { collapsible: true, collapsed: true },
      fields: [
        subjectField(
          REGISTRATION_LIMIT_ADMIN_MAIL_VARIABLES.subject,
          "nome do evento",
        ),
        headingField,
        proseField({
          name: "body",
          title: "Corpo",
          description: `Os parágrafos de abertura. Negrito e itálico; sem links. Variáveis: ${tokenList(
            REGISTRATION_LIMIT_ADMIN_MAIL_VARIABLES.body,
          )} (nome do evento, número de participantes).`,
          empty: "O corpo precisa de pelo menos um parágrafo com texto.",
          variables: REGISTRATION_LIMIT_ADMIN_MAIL_VARIABLES.body,
        }),
        ctaField,
        proseField({
          name: "closing",
          title: "Encerramento",
          description:
            "Os parágrafos depois do botão. Negrito e itálico; sem links. Sem variáveis.",
          empty: "O encerramento precisa de pelo menos um parágrafo com texto.",
          variables: REGISTRATION_LIMIT_ADMIN_MAIL_VARIABLES.closing,
        }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: "E-mails" }),
  },
})
