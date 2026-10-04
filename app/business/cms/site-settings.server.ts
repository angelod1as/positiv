import { logger } from "~/lib/logger/logger.server"
import type { SiteSettings } from "./site-settings.schema"
import { siteSnapshotCache } from "./site-snapshot-cache.server"
import type { SiteSnapshot } from "./site-snapshot.server"

type SnapshotCache = { get(): Promise<SiteSnapshot> }

export async function loadSiteSettings(
  cache: SnapshotCache = siteSnapshotCache,
): Promise<SiteSettings | null> {
  try {
    return (await cache.get()).siteSettings
  } catch (error) {
    logger.error("Could not load the Site Settings, rendering the fallback", {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
