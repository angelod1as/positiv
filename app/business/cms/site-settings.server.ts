import { logger } from "~/lib/logger/logger.server"
import type { SiteSettings } from "./site-settings.schema"
import { siteSnapshotCache } from "./site-snapshot-cache.server"
import type { SiteSnapshot } from "./site-snapshot.server"

export const SITE_SETTINGS_TIMEOUT_MS = 2_000

type SnapshotCache = { get(): Promise<SiteSnapshot> }

export type LoadedSiteSettings = {
  siteSettings: SiteSettings | null
  editorialSystemUnavailable: boolean
}

export async function loadSiteSettings(
  cache: SnapshotCache = siteSnapshotCache,
): Promise<LoadedSiteSettings> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Sanity took over ${SITE_SETTINGS_TIMEOUT_MS}ms`)),
      SITE_SETTINGS_TIMEOUT_MS,
    )
  })

  try {
    const { siteSettings } = await Promise.race([cache.get(), timeout])
    return { siteSettings, editorialSystemUnavailable: false }
  } catch (error) {
    logger.error("Could not load the Site Settings, rendering the fallback", {
      error: error instanceof Error ? error.message : String(error),
    })
    return { siteSettings: null, editorialSystemUnavailable: true }
  } finally {
    clearTimeout(timer)
  }
}
