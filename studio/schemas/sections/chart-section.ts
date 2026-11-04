import { BarChartIcon } from "@sanity/icons/BarChart"
import {
  defineArrayMember,
  defineField,
  defineType,
  type Path,
  type ValidationContext,
} from "sanity"

const MAX_SERIES = 8
const MAX_PARTS = 6

type Row = { values?: number[]; highlight?: boolean }
type Chart = { chartType?: string; series?: string[]; rows?: Row[] }

// A row's values are checked against the series of the section around them,
// which sits three steps up the path: rows, the row, its values.
function sectionOf({ document, path }: ValidationContext): Chart | undefined {
  return (path ?? []).slice(0, -3).reduce<unknown>(walk, document) as
    | Chart
    | undefined
}

function walk(value: unknown, segment: Path[number]): unknown {
  if (Array.isArray(value) && typeof segment === "object") {
    return value.find((item) => "_key" in segment && item?._key === segment._key)
  }
  if (value && typeof value === "object" && typeof segment === "string") {
    return (value as Record<string, unknown>)[segment]
  }
  return undefined
}

const isProportion = (chart: Chart | undefined) =>
  chart?.chartType === "proportion"

function valuesProblem(values: number[] | undefined, chart: Chart | undefined) {
  if (!values || !chart?.series) return undefined
  if (values.length !== chart.series.length) {
    return "Cada linha precisa de um valor para cada série"
  }
  if (isProportion(chart) && values.some((value) => value < 0)) {
    return "Na Barra 100% os valores não podem ser negativos"
  }
  return undefined
}

function seriesProblem(series: string[] | undefined, chart: Chart | undefined) {
  if (!series) return undefined
  if (series.length > MAX_SERIES) {
    return `No máximo ${MAX_SERIES} séries, uma para cada cor`
  }
  if (isProportion(chart) && series.length !== 1) {
    return "A Barra 100% tem uma série só"
  }
  return undefined
}

function rowsProblem(rows: Row[] | undefined, chart: Chart | undefined) {
  if (!rows) return undefined
  if (rows.filter((row) => row.highlight).length > 1) {
    return "Só uma linha pode ser destaque"
  }
  if (isProportion(chart) && rows.length > MAX_PARTS) {
    return `A Barra 100% tem no máximo ${MAX_PARTS} partes`
  }
  return undefined
}

export const chartSection = defineType({
  name: "chartSection",
  title: "Gráfico",
  description:
    "Barra vertical, barra horizontal, linha ou barra 100%, com Resumo e tabela de dados",
  type: "object",
  icon: BarChartIcon,
  fields: [
    defineField({
      name: "title",
      title: "Título",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "summary",
      title: "Resumo",
      description:
        "Uma ou duas frases com o que o gráfico mostra. Sempre visível, e é o que o leitor de tela lê no lugar do gráfico",
      type: "text",
      rows: 2,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "chartType",
      title: "Tipo",
      type: "string",
      options: {
        list: [
          { title: "Barra vertical", value: "bar" },
          { title: "Barra horizontal", value: "horizontalBar" },
          { title: "Linha", value: "line" },
          { title: "Barra 100%", value: "proportion" },
        ],
        layout: "radio",
      },
      initialValue: "bar",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "unit",
      title: "Unidade",
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
    }),
    defineField({
      name: "series",
      title: "Séries",
      description:
        "O nome de cada valor das linhas, na ordem, por exemplo “Novates” e “Veteranes”. A Barra 100% tem uma série só",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      validation: (rule) =>
        rule
          .required()
          .min(1)
          .custom<string[]>(
            (series, context) =>
              seriesProblem(series, context.parent as Chart) ?? true,
          ),
    }),
    defineField({
      name: "rows",
      title: "Linhas",
      description:
        "Na Barra 100%, só partes que somam o todo, no máximo 6",
      type: "array",
      of: [
        defineArrayMember({
          name: "chartRow",
          title: "Linha",
          type: "object",
          fields: [
            defineField({
              name: "label",
              title: "Legenda",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "values",
              title: "Valores",
              description: "Um para cada série, na mesma ordem",
              type: "array",
              of: [defineArrayMember({ type: "number" })],
              validation: (rule) =>
                rule
                  .required()
                  .min(1)
                  .custom<number[]>(
                    (values, context) =>
                      valuesProblem(values, sectionOf(context)) ?? true,
                  ),
            }),
            defineField({
              name: "highlight",
              title: "Destaque",
              description: "Pinta esta linha com a cor de destaque",
              type: "boolean",
              initialValue: false,
            }),
          ],
          preview: {
            select: { title: "label", values: "values", highlight: "highlight" },
            prepare: ({ title, values, highlight }) => ({
              title: title ?? "",
              subtitle: [
                (values as number[] | undefined)?.join(" · "),
                highlight ? "destaque" : undefined,
              ]
                .filter(Boolean)
                .join(" — "),
            }),
          },
        }),
      ],
      validation: (rule) =>
        rule
          .required()
          .min(1)
          .custom<Row[]>(
            (rows, context) => rowsProblem(rows, context.parent as Chart) ?? true,
          ),
    }),
  ],
  preview: {
    select: { title: "title" },
    prepare: ({ title }) => ({ title: title || "Gráfico" }),
  },
})
