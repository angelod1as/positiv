import { parseArgs } from "node:util"

import { fillPatches, missingFields, singletonBase } from "./transform"

export type Store = {
  current(): Promise<Record<string, unknown> | null>
  fill(
    base: Record<string, unknown>,
    patches: Record<string, unknown>[],
  ): Promise<void>
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
  const dryRun = !values["no-dry-run"]
  const missing = missingFields(await store.current())

  if (!dryRun && missing.length > 0) {
    await store.fill(singletonBase, fillPatches())
  }

  return { dryRun, missing }
}
