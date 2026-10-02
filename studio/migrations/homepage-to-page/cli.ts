import { getCliClient } from "sanity/cli"

import { HOMEPAGE_ID } from "../../singletons"
import { run } from "./run"

const separator = process.argv.indexOf("--")

const { dryRun, page } = await run(
  process.argv.slice(separator === -1 ? 2 : separator + 1),
  (dataset) => {
    const client = getCliClient({ apiVersion: "2026-09-24" }).withConfig({
      dataset,
      perspective: "published",
      useCdn: false,
    })

    return {
      fetchHomepage: () =>
        client.fetch(`*[_id == $id][0]`, { id: HOMEPAGE_ID }),
      createOrReplace: async (document) => {
        await client.createOrReplace(document)
      },
    }
  },
)

console.log(JSON.stringify(page, null, 2))
console.log(
  dryRun
    ? "Dry run: nothing was written. Add --no-dry-run to write the Page."
    : `Wrote ${page._id}.`,
)
