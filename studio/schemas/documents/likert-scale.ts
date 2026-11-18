import { ClipboardIcon } from "@sanity/icons/Clipboard"
import { defineArrayMember, defineField, defineType } from "sanity"

import {
  duplicateKeys,
  LIKERT_KEY_PATTERN,
} from "../../../app/business/cms/likert-key"

export function newLikertKey() {
  return crypto.randomUUID()
}

const nonBlank = (message: string) => (value: string | undefined) =>
  value !== undefined && value.trim().length === 0 ? message : true

const requiredText = ({
  name,
  title,
  description,
  blank,
}: {
  name: string
  title: string
  description?: string
  blank: string
}) =>
  defineField({
    name,
    title,
    description,
    type: "string",
    validation: (rule) => rule.required().custom(nonBlank(blank)),
  })

const keyField = defineField({
  name: "key",
  title: "Chave",
  description:
    "Identifica as respostas no banco. Criada sozinha e nunca muda — mesmo que o texto mude.",
  type: "string",
  readOnly: true,
  initialValue: newLikertKey,
  validation: (rule) =>
    rule
      .required()
      .regex(LIKERT_KEY_PATTERN, { name: "letras minúsculas, números e hífens" }),
})

const uniqueKeys =
  (what: string) => (keys: (string | undefined)[]) => {
    const repeated = duplicateKeys(
      keys.filter((key): key is string => key !== undefined),
    )
    return repeated.length === 0
      ? true
      : `${what} com chave repetida (${repeated.join(", ")}). Apague a cópia e crie de novo.`
  }

type Keyed = { key?: string }
type Theme = { statements?: Keyed[] }

export const likertScale = defineType({
  name: "likertScale",
  title: "Escala de Likert",
  type: "document",
  icon: ClipboardIcon,
  fields: [
    defineField({
      name: "themes",
      title: "Temas",
      description:
        "Os temas aparecem na ordem desta lista, e as afirmações na ordem de cada tema. Arraste para reordenar.",
      type: "array",
      validation: (rule) =>
        rule
          .required()
          .min(1)
          .custom((themes: Theme[] | undefined) =>
            uniqueKeys("Há afirmações")(
              (themes ?? []).flatMap((theme) =>
                (theme.statements ?? []).map((statement) => statement.key),
              ),
            ),
          ),
      of: [
        defineArrayMember({
          name: "likertTheme",
          title: "Tema",
          type: "object",
          fields: [
            requiredText({
              name: "name",
              title: "Nome",
              blank: "O nome do tema não pode ficar em branco.",
            }),
            defineField({
              name: "statements",
              title: "Afirmações",
              type: "array",
              validation: (rule) => rule.required().min(1),
              of: [
                defineArrayMember({
                  name: "likertStatement",
                  title: "Afirmação",
                  type: "object",
                  fields: [
                    requiredText({
                      name: "text",
                      title: "Texto",
                      blank: "A afirmação não pode ficar em branco.",
                    }),
                    keyField,
                  ],
                  preview: { select: { title: "text" } },
                }),
              ],
            }),
          ],
          preview: { select: { title: "name" } },
        }),
      ],
    }),
    defineField({
      name: "venues",
      title: "A quais destes você já foi?",
      type: "object",
      validation: (rule) => rule.required(),
      fields: [
        requiredText({
          name: "question",
          title: "Pergunta",
          blank: "A pergunta não pode ficar em branco.",
        }),
        defineField({
          name: "options",
          title: "Opções",
          description: "A pessoa marca quantas quiser.",
          type: "array",
          validation: (rule) =>
            rule
              .required()
              .min(1)
              .custom((options: Keyed[] | undefined) =>
                uniqueKeys("Há opções")(
                  (options ?? []).map((option) => option.key),
                ),
              ),
          of: [
            defineArrayMember({
              name: "likertOption",
              title: "Opção",
              type: "object",
              fields: [
                requiredText({
                  name: "label",
                  title: "Texto",
                  blank: "A opção não pode ficar em branco.",
                }),
                keyField,
              ],
              preview: { select: { title: "label" } },
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: "nonMonogamySince",
      title: "Desde quando você vive a não-monogamia?",
      type: "object",
      validation: (rule) => rule.required(),
      fields: [
        requiredText({
          name: "question",
          title: "Pergunta",
          description: "A pessoa responde com mês e ano.",
          blank: "A pergunta não pode ficar em branco.",
        }),
        requiredText({
          name: "notLivingLabel",
          title: "Texto da opção de quem não vive hoje",
          blank: "O texto da opção não pode ficar em branco.",
        }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: "Escala de Likert" }),
  },
})
