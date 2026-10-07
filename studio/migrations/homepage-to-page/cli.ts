import { getCliClient } from "sanity/cli"

import { HOMEPAGE_PAGE_ID } from "../../schemas/documents/page"
import { run } from "./run"

// The id of the old homepage singleton this migration reads from. The document
// type is gone (POS-589), but the migration still runs against datasets that
// hold the document.
const HOMEPAGE_ID = "homepage"

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
      pageHasDraft: async () => {
        const pageHasDraft = await client
          .withConfig({ perspective: "raw" })
          .fetch<boolean>(`defined(*[_id == $id][0]._id)`, {
            id: `drafts.${HOMEPAGE_PAGE_ID}`,
          })

        if (pageHasDraft) {
          console.warn(
            `${HOMEPAGE_PAGE_ID} has an unpublished draft, which the Studio shows over this Page. Discard it in the Studio.`,
          )
        }

        return pageHasDraft
      },
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
