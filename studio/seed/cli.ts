import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { getCliClient } from "sanity/cli"

import { seed } from "./seed"

const client = getCliClient({ apiVersion: "2026-09-24" })

const photo = fileURLToPath(
  new URL("../../public/positiv-logo-colors.png", import.meta.url),
)

await seed(client.config().dataset, {
  uploadPhoto: async () =>
    (
      await client.assets.upload("image", readFileSync(photo), {
        filename: "seed-person.png",
      })
    )._id,
  replace: async (documents) => {
    await documents
      .reduce(
        (transaction, document) => transaction.createOrReplace(document),
        client.transaction(),
      )
      .commit()
  },
})

console.log(`Seeded ${client.config().dataset}.`)
