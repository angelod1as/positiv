import { logger } from "~/lib/logger/logger.server"
import type { SiteSettings } from "./site-settings.schema"
import { siteSnapshotCache } from "./site-snapshot-cache.server"
import type { SiteSnapshot } from "./site-snapshot.server"

export const SITE_SETTINGS_TIMEOUT_MS = 2_000

type SnapshotCache = { get(): Promise<SiteSnapshot> }

export async function loadSiteSettings(
  cache: SnapshotCache = siteSnapshotCache,
): Promise<SiteSettings | null> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Sanity took over ${SITE_SETTINGS_TIMEOUT_MS}ms`)),
      SITE_SETTINGS_TIMEOUT_MS,
    )
  })

  try {
    return (await Promise.race([cache.get(), timeout])).siteSettings
  } catch (error) {
    logger.error("Could not load the Site Settings, rendering the fallback", {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  } finally {
    clearTimeout(timer)
  }
}
