import { zod } from "~/lib/helpers/zod"
import {
  type ClientConfig,
  type PagesSnapshot,
  resolvePagesSnapshot,
} from "./pages-snapshot.server"
import { createSanityClient } from "./sanity-client.server"
import { type SiteSettings, siteSettingsSchema } from "./site-settings.schema"
import { siteSnapshotQuery } from "./site-snapshot-query"

export type SiteSnapshot = {
  pages: PagesSnapshot
  siteSettings: SiteSettings | null
}

type SiteClient = {
  fetch(query: string): Promise<unknown>
  config(): ClientConfig
}

const responseSchema = zod.object({
  pages: zod.unknown(),
  siteSettings: zod.unknown(),
})

export async function getSiteSnapshot(
  client: SiteClient = createSanityClient(),
): Promise<SiteSnapshot> {
  const response = responseSchema.parse(await client.fetch(siteSnapshotQuery))

  return {
    pages: resolvePagesSnapshot(response.pages, client.config()),
    siteSettings: resolveSiteSettings(response.siteSettings),
  }
}

function resolveSiteSettings(document: unknown): SiteSettings | null {
  if (document === null || document === undefined) return null

  const result = siteSettingsSchema.safeParse(document)
  if (!result.success) {
    throw new Error(
      `Site Settings failed validation, so the snapshot is not served:\n${zod.prettifyError(result.error)}`,
    )
  }
  return result.data
}
