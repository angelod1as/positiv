import { createReadStream } from "node:fs"
import { writeFile } from "node:fs/promises"
import { resolve } from "node:path"

import { homepageQuery } from "../../app/business/cms/homepage-query"
import { homepageCopy } from "../../app/copy/homepage"
import { buildSeed } from "./build-seed"
import { seedClient } from "./seed-client"

const repositoryRoot = resolve(process.cwd(), "..")
const fixturePath = resolve(
  repositoryRoot,
  "e2e/fixtures/homepage-content.json",
)

const client = seedClient(process.argv)
const { projectId, dataset } = client.config()

async function uploadPhoto(founder: string) {
  const asset = await client.assets.upload(
    "image",
    createReadStream(
      resolve(repositoryRoot, `app/assets/pictures/${founder}.jpg`),
    ),
    { filename: `${founder}.jpg` },
  )

  return asset._id
}

console.log(
  `Seeding the homepage into project ${projectId}, dataset "${dataset}"`,
)

const { homepage, people } = buildSeed(homepageCopy, {
  julia: await uploadPhoto("julia"),
  angelo: await uploadPhoto("angelo"),
})

const transaction = client.transaction()

people.forEach((person) => transaction.createOrReplace(person))
transaction.createOrReplace(homepage)

await transaction.commit()

const content = await client.fetch(homepageQuery)

await writeFile(fixturePath, `${JSON.stringify(content, null, 2)}\n`)

console.log(`Wrote ${people.length + 1} documents and ${fixturePath}`)
