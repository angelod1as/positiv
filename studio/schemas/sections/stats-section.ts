import { BarChartIcon } from "@sanity/icons/BarChart"
import { NumberIcon } from "@sanity/icons/Number"
import { TrendUpwardIcon } from "@sanity/icons/TrendUpward"
import {
  defineArrayMember,
  defineField,
  defineType,
  type FieldDefinition,
} from "sanity"

const unitField = defineField({
  name: "unit",
  title: "Unidade",
  description: "Texto como “pessoas” ou “festas” vai na legenda",
  type: "string",
  options: {
    list: [
      { title: "Nenhuma", value: "none" },
      { title: "%", value: "percent" },
      { title: "R$", value: "brl" },
    ],
    layout: "radio",
    direction: "horizontal",
  },
  initialValue: "none",
  validation: (rule) => rule.required(),
})

const captionField = defineField({
  name: "caption",
  title: "Legenda",
  description: "O que o número conta, por exemplo “festas” ou “de novates”",
  type: "string",
  validation: (rule) => rule.required(),
})

function numberField(name: string, title: string, description?: string) {
  return defineField({
    name,
    title,
    description,
    type: "number",
    validation: (rule) => rule.required(),
  })
}

function labelField(name: string, title: string) {
  return defineField({
    name,
    title,
    description: "Por exemplo 2025",
    type: "string",
    validation: (rule) => rule.required(),
  })
}

const cardFields = (...fields: FieldDefinition[]) => [
  ...fields,
  captionField,
  unitField,
]

type Range = { min?: number; average?: number; max?: number }

function rangeProblem(range: Range | undefined) {
  const { min, average, max } = range ?? {}
  if (min === undefined || average === undefined || max === undefined) {
    return undefined
  }

  return min <= average && average <= max
    ? undefined
    : "A média precisa ficar entre o mínimo e o máximo"
}

export const statsSection = defineType({
  name: "statsSection",
  title: "Números",
  description:
    "Cartões com os números do ano: número grande, intervalo e comparação",
  type: "object",
  icon: BarChartIcon,
  fields: [
    defineField({
      name: "title",
      title: "Título",
      description: "Opcional",
      type: "string",
    }),
    defineField({
      name: "cards",
      title: "Cartões",
      type: "array",
      of: [
        defineArrayMember({
          name: "statNumber",
          title: "Número grande",
          type: "object",
          icon: NumberIcon,
          fields: cardFields(numberField("value", "Valor")),
          preview: {
            select: { title: "caption", value: "value" },
            prepare: ({ title, value }) => ({
              title: `${value ?? ""} ${title ?? ""}`.trim(),
              subtitle: "Número grande",
            }),
          },
        }),
        defineArrayMember({
          name: "statRange",
          title: "Intervalo",
          type: "object",
          icon: BarChartIcon,
          fields: cardFields(
            numberField("min", "Mínimo"),
            numberField("average", "Média", "O número em destaque"),
            numberField("max", "Máximo"),
          ),
          validation: (rule) =>
            rule.custom<Range>((range) => rangeProblem(range) ?? true),
          preview: {
            select: { title: "caption", average: "average" },
            prepare: ({ title, average }) => ({
              title: `${average ?? ""} ${title ?? ""}`.trim(),
              subtitle: "Intervalo",
            }),
          },
        }),
        defineArrayMember({
          name: "statComparison",
          title: "Comparação",
          type: "object",
          icon: TrendUpwardIcon,
          description:
            "A variação é calculada: em pontos percentuais quando a unidade é %, em % nos outros casos",
          fields: cardFields(
            labelField("beforeLabel", "Período anterior"),
            numberField("before", "Valor anterior"),
            labelField("afterLabel", "Período atual"),
            numberField("after", "Valor atual"),
          ),
          preview: {
            select: {
              title: "caption",
              beforeLabel: "beforeLabel",
              afterLabel: "afterLabel",
            },
            prepare: ({ title, beforeLabel, afterLabel }) => ({
              title: title ?? "Comparação",
              subtitle: `Comparação: ${beforeLabel ?? "?"} → ${afterLabel ?? "?"}`,
            }),
          },
        }),
      ],
      validation: (rule) => rule.required().min(1),
    }),
  ],
  preview: {
    select: { title: "title" },
    prepare: ({ title }) => ({ title: title || "Números" }),
  },
})
