import { getCliClient } from "sanity/cli"

import { EMAIL_TEMPLATES_ID } from "../../singletons"
import { run } from "./run"

const separator = process.argv.indexOf("--")

const { dryRun, missing } = await run(
  process.argv.slice(separator === -1 ? 2 : separator + 1),
  (dataset) => {
    const client = getCliClient({ apiVersion: "2026-09-24" }).withConfig({
      dataset,
      perspective: "published",
      useCdn: false,
    })

    return {
      current: () =>
        client.fetch(`*[_id == $id][0]`, { id: EMAIL_TEMPLATES_ID }),
      fill: async (base, patches) => {
        const transaction = client.transaction().createIfNotExists({
          _id: EMAIL_TEMPLATES_ID,
          _type: String(base._type),
        })
        for (const patch of patches) {
          transaction.patch(EMAIL_TEMPLATES_ID, (p) => p.setIfMissing(patch))
        }
        await transaction.commit()
      },
    }
  },
)

if (missing.length === 0) {
  console.log("Every email already has its copy; nothing to write.")
} else {
  console.log(`Missing fields:\n${missing.map((path) => `  ${path}`).join("\n")}`)
  console.log(
    dryRun
      ? "Dry run: nothing was written. Add --no-dry-run to fill them."
      : `Filled ${missing.length} fields; fields an Editor had set were left alone.`,
  )
}
