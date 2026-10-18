import { getCliClient } from "sanity/cli"

import { run } from "./run"

const separator = process.argv.indexOf("--")

const { dryRun, document } = await run(
  process.argv.slice(separator === -1 ? 2 : separator + 1),
  (dataset) => {
    const client = getCliClient({ apiVersion: "2026-09-24" }).withConfig({
      dataset,
      perspective: "published",
      useCdn: false,
    })

    return {
      createOrReplace: async (value) => {
        await client.createOrReplace(value)
      },
    }
  },
)

console.log(JSON.stringify(document, null, 2))
console.log(
  dryRun
    ? "Dry run: nothing was written. Add --no-dry-run to write the E-mails singleton."
    : `Wrote ${document._id}.`,
)
