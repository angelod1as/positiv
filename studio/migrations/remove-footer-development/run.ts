import { parseArgs } from "node:util"

import { footerDevelopmentUnset } from "./transform"

export type Store = {
  existingIds(ids: string[]): Promise<string[]>
  unset(ids: string[], paths: string[]): Promise<void>
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
  const { ids, unset } = footerDevelopmentUnset()
  const dryRun = !values["no-dry-run"]
  const present = await store.existingIds(ids)

  if (!dryRun && present.length > 0) {
    await store.unset(present, unset)
  }

  return { dryRun, ids: present, unset }
}
