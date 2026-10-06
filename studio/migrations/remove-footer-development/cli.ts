import { getCliClient } from "sanity/cli"

import { SITE_SETTINGS_ID } from "../../singletons"
import { run } from "./run"

const separator = process.argv.indexOf("--")

const { dryRun, ids, unset } = await run(
  process.argv.slice(separator === -1 ? 2 : separator + 1),
  (dataset) => {
    const client = getCliClient({ apiVersion: "2026-09-24" }).withConfig({
      dataset,
      perspective: "raw",
      useCdn: false,
    })

    return {
      existingIds: (candidates) =>
        client.fetch<string[]>(`*[_id in $ids]._id`, { ids: candidates }),
      unset: async (documentIds, paths) => {
        await documentIds
          .reduce(
            (transaction, id) =>
              transaction.patch(id, (patch) => patch.unset(paths)),
            client.transaction(),
          )
          .commit()
      },
    }
  },
)

console.log(JSON.stringify({ ids, unset }, null, 2))
console.log(
  dryRun
    ? "Dry run: nothing was written. Add --no-dry-run to unset footer.development."
    : ids.length > 0
      ? `Unset ${unset.join(", ")} on ${ids.join(", ")}.`
      : `No ${SITE_SETTINGS_ID} document to unset.`,
)
