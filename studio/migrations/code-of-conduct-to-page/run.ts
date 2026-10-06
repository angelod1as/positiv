import { parseArgs } from "node:util"

import { codeOfConductToPage, PageDocument } from "./transform"

export type Store = {
  pageHasDraft(): Promise<boolean>
  createOrReplace(page: PageDocument): Promise<void>
}

const usage = "Usage: --dataset <name> [--no-dry-run]"

export async function run(args: string[], connect: (dataset: string) => Store) {
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
  const page = codeOfConductToPage()
  const dryRun = !values["no-dry-run"]
  const pageHasDraft = await store.pageHasDraft()

  if (!dryRun) {
    await store.createOrReplace(page)
  }

  return { dryRun, page, pageHasDraft }
}
