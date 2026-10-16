import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { generateSiteSnapshotFixture, serializeFixture } from "./generate"

const { pages, siteSettings, paymentMessages } =
  await generateSiteSnapshotFixture()

function write(name: string, value: unknown) {
  const path = fileURLToPath(
    new URL(`../../e2e/fixtures/${name}`, import.meta.url),
  )
  writeFileSync(path, serializeFixture(value))
  return path
}

write("pages-snapshot.json", pages)
write("site-settings.json", siteSettings)
write("payment-messages.json", paymentMessages)

console.log(
  "Wrote e2e/fixtures/pages-snapshot.json, site-settings.json and payment-messages.json from the seed.",
)
