import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { generateSiteSnapshotFixture, serializeFixture } from "./generate"

const { pages, siteSettings } = await generateSiteSnapshotFixture()

function write(name: string, value: unknown) {
  const path = fileURLToPath(
    new URL(`../../e2e/fixtures/${name}`, import.meta.url),
  )
  writeFileSync(path, serializeFixture(value))
  return path
}

write("pages-snapshot.json", pages)
write("site-settings.json", siteSettings)

console.log(
  "Wrote e2e/fixtures/pages-snapshot.json and site-settings.json from the seed.",
)
