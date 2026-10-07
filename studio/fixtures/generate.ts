import { evaluate, parse } from "groq-js"

import { siteSnapshotQuery } from "../../app/business/cms/site-snapshot-query"
import { seedDocuments } from "../seed/seed"

// A fixed, synthetic image asset id. The resolver in the app builds every image
// URL from this reference, so pinning it keeps the generated URLs deterministic
// and free of any uploaded asset.
export const FIXTURE_IMAGE_ASSET_ID =
  "image-8b97adcf62f1edd1fb35ab19806a468de3acca6e-1000x184-png"

const FIXTURE_IMAGE_DIMENSIONS = { width: 1000, height: 184 }

const FIXTURE_UPDATED_AT = "2026-10-06T00:00:00Z"

export type SiteSnapshotFixture = { pages: unknown; siteSettings: unknown }

function fixtureDataset() {
  const documents = seedDocuments(FIXTURE_IMAGE_ASSET_ID).map((document) =>
    document._type === "page"
      ? { ...document, _updatedAt: FIXTURE_UPDATED_AT }
      : document,
  )

  return [
    ...documents,
    {
      _id: FIXTURE_IMAGE_ASSET_ID,
      _type: "sanity.imageAsset",
      metadata: { dimensions: FIXTURE_IMAGE_DIMENSIONS },
    },
  ]
}

// Resolves the seed documents through the app's own siteSnapshotQuery, so the
// fixtures can never drift from the real resolver.
export async function generateSiteSnapshotFixture(): Promise<SiteSnapshotFixture> {
  const value = await evaluate(parse(siteSnapshotQuery), {
    dataset: fixtureDataset(),
  })

  return (await value.get()) as SiteSnapshotFixture
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys)
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, sortKeys(record[key])]),
    )
  }
  return value
}

// Stable serialisation — sorted keys, two-space indent, trailing newline — so a
// regeneration produces a byte-identical file and the staleness test can compare
// the committed fixture against freshly generated content.
export function serializeFixture(value: unknown): string {
  return `${JSON.stringify(sortKeys(value), null, 2)}\n`
}
