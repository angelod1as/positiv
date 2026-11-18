import { ClipboardIcon } from "@sanity/icons/Clipboard"
import { defineArrayMember, defineField, defineType } from "sanity"

import {
  duplicateKeys,
  LIKERT_KEY_PATTERN,
} from "../../../app/business/cms/likert-key"

export function newLikertKey() {
  return crypto.randomUUID()
}

type Keyed = { key?: string }

export const likertScale = defineType({
  name: "likertScale",
  title: "Escala de Likert",
  type: "document",
  icon: ClipboardIcon,
  fields: [
    defineField({
      name: "statements",
      title: "Afirmações",
      description:
        "Essa página é a configuração da Escala de Likert aplicada nos participantes dos eventos. Ela pode mudar — perguntas podem ser adicionadas ou removidas — sem perda de dados.",
      type: "array",
      validation: (rule) => rule.required().min(1),
      of: [
        defineArrayMember({
          name: "likertStatement",
          title: "Afirmação",
          type: "object",
          validation: (rule) =>
            rule.custom((statement: Keyed | undefined, context) => {
              const keys = (
                (context.document?.statements as Keyed[] | undefined) ?? []
              )
                .map((other) => other.key)
                .filter((key): key is string => key !== undefined)
              return statement?.key &&
                duplicateKeys(keys).includes(statement.key)
                ? "Esta afirmação é uma cópia de outra. Apague-a e crie de novo."
                : true
            }),
          fields: [
            defineField({
              name: "text",
              title: "Texto",
              type: "string",
              validation: (rule) =>
                rule
                  .required()
                  .custom((value: string | undefined) =>
                    value !== undefined && value.trim().length === 0
                      ? "A afirmação não pode ficar em branco."
                      : true,
                  ),
            }),
            // Answers are stored against this key, so editing the text keeps
            // the history attached. Generated on creation, never shown.
            defineField({
              name: "key",
              title: "Chave",
              type: "string",
              hidden: true,
              initialValue: newLikertKey,
              validation: (rule) =>
                rule.required().regex(LIKERT_KEY_PATTERN, {
                  name: "letras minúsculas, números e hífens",
                }),
            }),
          ],
          preview: { select: { title: "text" } },
        }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: "Escala de Likert" }),
  },
})
