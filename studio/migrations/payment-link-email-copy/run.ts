import { parseArgs } from "node:util"

import { emailTemplatesDocument, type EmailTemplatesDocument } from "./transform"

export type Store = {
  exists(): Promise<boolean>
  createIfNotExists(document: EmailTemplatesDocument): Promise<void>
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
  const document = emailTemplatesDocument()
  const dryRun = !values["no-dry-run"]
  const exists = await store.exists()

  if (!dryRun) {
    await store.createIfNotExists(document)
  }

  return { dryRun, document, exists }
}
