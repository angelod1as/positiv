import { getCliClient } from "sanity/cli"

import { run, SOURCE_PAGE_ADDRESS } from "./run"

const separator = process.argv.indexOf("--")

const client = (dataset: string) =>
  getCliClient({ apiVersion: "2026-09-24" }).withConfig({
    dataset,
    useCdn: false,
  })

const { dryRun, document } = await run(
  process.argv.slice(separator === -1 ? 2 : separator + 1),
  (dataset, sourceDataset) => ({
    // The draft wins over the published Page: the text was being written there.
    sourceSections: () =>
      client(sourceDataset)
        .withConfig({ perspective: "drafts" })
        .fetch(`*[_type == "page" && address == $address][0].sections`, {
          address: SOURCE_PAGE_ADDRESS,
        }),
    write: async (rules) => {
      await client(dataset).createOrReplace(rules)
    },
  }),
)

console.log(JSON.stringify(document, null, 2))
console.log(
  dryRun
    ? "Dry run: nothing was written. Add --no-dry-run to write the draft Rules."
    : `Wrote ${document._id}. Read it in the Studio, then publish it.`,
)
