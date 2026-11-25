import { getCliClient } from "sanity/cli"

import { LIKERT_SCALE_ID } from "../../singletons"
import { run } from "./run"

const separator = process.argv.indexOf("--")

const client = (dataset: string) =>
  getCliClient({ apiVersion: "2026-09-24" }).withConfig({
    dataset,
    useCdn: false,
  })

const { dryRun, document } = await run(
  process.argv.slice(separator === -1 ? 2 : separator + 1),
  (dataset) => ({
    existingScale: () =>
      client(dataset)
        .withConfig({ perspective: "raw" })
        .fetch(`*[_id in [$id, "drafts." + $id]][0]{ _id }`, {
          id: LIKERT_SCALE_ID,
        }),
    write: async (scale) => {
      await client(dataset).create(scale)
    },
  }),
)

console.log(JSON.stringify(document, null, 2))
console.log(
  dryRun
    ? `Dry run: nothing was written. ${document.statements.length} statements. Add --no-dry-run to write the draft scale.`
    : `Wrote ${document._id} with ${document.statements.length} statements. Read it in the Studio, then publish it.`,
)
