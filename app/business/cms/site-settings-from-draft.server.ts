import { logger } from "~/lib/logger/logger.server"
import { draftSettingsSchema, resolveSiteSettings } from "./resolve-snapshot"
import {
  type LoadedSiteSettings,
  loadSiteSettings,
} from "./site-settings.server"

export async function siteSettingsFromDraft(
  data: unknown,
): Promise<LoadedSiteSettings> {
  try {
    const { siteSettings } = draftSettingsSchema.parse(data)
    return {
      siteSettings: resolveSiteSettings(siteSettings),
      editorialSystemUnavailable: false,
    }
  } catch (error) {
    // Match the Page loader: an unparseable draft degrades to the published
    // snapshot rather than flagging the chrome unavailable, so a half-saved
    // Site Settings edit shows last-published chrome, not an error banner.
    logger.error("Could not resolve the draft Site Settings", {
      error: error instanceof Error ? error.message : String(error),
    })
    return loadSiteSettings()
  }
}
