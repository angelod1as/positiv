import { parseArgs } from "node:util"

import {
  rulesDocument,
  type SourceBlock,
  splitIntoRules,
} from "./transform"

export const SOURCE_PAGE_ADDRESS = "/regras-e-acordos"

type SourceSection = { title?: string | null; body?: SourceBlock[] | null }

export type Store = {
  sourceSections(): Promise<SourceSection[] | null>
  write(document: ReturnType<typeof rulesDocument>): Promise<void>
}

const usage =
  "Usage: --dataset <name> [--source-dataset <name>] [--no-dry-run]"

function sectionTitled(sections: SourceSection[], title: string) {
  const section = sections.find(
    (candidate) =>
      candidate.title?.trim().toLowerCase() === title.toLowerCase(),
  )
  if (!section?.body) {
    throw new Error(
      `A página ${SOURCE_PAGE_ADDRESS} não tem a seção "${title}" com texto.`,
    )
  }
  return section.body
}

export async function run(
  args: string[],
  connect: (dataset: string, sourceDataset: string) => Store,
) {
  const { values } = parseArgs({
    args,
    options: {
      dataset: { type: "string" },
      "source-dataset": { type: "string", default: "production" },
      "no-dry-run": { type: "boolean", default: false },
    },
  })

  if (!values.dataset) {
    throw new Error(`Pass the dataset explicitly with --dataset. ${usage}`)
  }

  const store = connect(values.dataset, values["source-dataset"])
  const sections = await store.sourceSections()
  if (!sections) {
    throw new Error(`Não há página em ${SOURCE_PAGE_ADDRESS} para ler.`)
  }

  const document = rulesDocument({
    generalRules: splitIntoRules(sectionTitled(sections, "Regras gerais"), "geral"),
    agreements: splitIntoRules(sectionTitled(sections, "Acordos"), "acordo"),
    privateRules: [],
  })

  const dryRun = !values["no-dry-run"]
  if (!dryRun) {
    await store.write(document)
  }

  return { dryRun, document }
}
