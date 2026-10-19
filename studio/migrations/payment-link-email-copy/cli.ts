import { getCliClient } from "sanity/cli"

import { EMAIL_TEMPLATES_ID } from "../../singletons"
import { run } from "./run"

const separator = process.argv.indexOf("--")

const { dryRun, document, exists } = await run(
  process.argv.slice(separator === -1 ? 2 : separator + 1),
  (dataset) => {
    const client = getCliClient({ apiVersion: "2026-09-24" }).withConfig({
      dataset,
      perspective: "published",
      useCdn: false,
    })

    return {
      exists: async () =>
        Boolean(
          await client.fetch(`defined(*[_id == $id][0]._id)`, {
            id: EMAIL_TEMPLATES_ID,
          }),
        ),
      createIfNotExists: async (value) => {
        await client.createIfNotExists(value)
      },
    }
  },
)

console.log(JSON.stringify(document, null, 2))
if (exists) {
  console.warn(
    `${EMAIL_TEMPLATES_ID} already exists; createIfNotExists will not overwrite it. Delete it first if you mean to reseed.`,
  )
}
console.log(
  dryRun
    ? "Dry run: nothing was written. Add --no-dry-run to write the E-mails singleton."
    : exists
      ? `${document._id} already existed; nothing was written.`
      : `Wrote ${document._id}.`,
)
