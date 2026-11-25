import { parseArgs } from "node:util"

import { LIKERT_SCALE_ID } from "../../singletons"
import { COUNCIL_STATEMENTS } from "./statements"

type LikertStatement = {
  _type: "likertStatement"
  _key: string
  key: string
  text: string
}

type LikertScaleDocument = {
  _id: string
  _type: "likertScale"
  statements: LikertStatement[]
}

export type Store = {
  existingScale(): Promise<{ _id: string } | null>
  write(document: LikertScaleDocument): Promise<void>
}

const usage = "Usage: --dataset <name> [--no-dry-run]"

function likertScaleDocument(): LikertScaleDocument {
  return {
    _id: `drafts.${LIKERT_SCALE_ID}`,
    _type: "likertScale",
    statements: COUNCIL_STATEMENTS.map((text, index) => {
      const key = `afirmacao-${String(index + 1).padStart(2, "0")}`
      return { _type: "likertStatement", _key: key, key, text }
    }),
  }
}

export async function run(
  args: string[],
  connect: (dataset: string) => Store,
) {
  const { values } = parseArgs({
    args,
    options: {
      dataset: { type: "string" },
      "no-dry-run": { type: "boolean", default: false },
    },
  })

  if (!values.dataset) {
    throw new Error(`Pass the dataset explicitly with --dataset. ${usage}`)
  }

  const store = connect(values.dataset)
  const existing = await store.existingScale()
  if (existing) {
    throw new Error(
      `${values.dataset} already has a Likert scale (${existing._id}). Edit it in the Studio: replacing it would detach stored answers or discard a draft.`,
    )
  }

  const document = likertScaleDocument()
  const dryRun = !values["no-dry-run"]
  if (!dryRun) {
    await store.write(document)
  }

  return { dryRun, document }
}
