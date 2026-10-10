import type { QueryResponseInitial } from "@sanity/react-loader"
import { useEffect, useMemo } from "react"
import { useQuery } from "~/business/cms/live-loader"
import {
  draftSettingsSchema,
  resolveSiteSettings,
} from "~/business/cms/resolve-snapshot"
import type { SiteSettings } from "~/business/cms/site-settings.schema"

type LiveAppShellProps = {
  snapshot: {
    initial: QueryResponseInitial<unknown>
    query: string
    params: Record<string, never>
  }
  onSiteSettings: (siteSettings: SiteSettings | null) => void
}

// Reports live Site Settings up and renders nothing, so the chrome it feeds
// keeps its tree position and never remounts when this live code loads.
export function LiveAppShell({ snapshot, onSiteSettings }: LiveAppShellProps) {
  const { data } = useQuery<unknown>(snapshot.query, snapshot.params, {
    initial: snapshot.initial,
  })

  const result = useMemo(() => siteSettingsFrom(data), [data])

  useEffect(() => {
    // A legitimately empty document reports null; an invalid transient edit
    // reports nothing, so the chrome keeps its last good value rather than
    // blanking while an editor types, matching PageRoute's last-good Page.
    if (result.ok) onSiteSettings(result.siteSettings)
  }, [result, onSiteSettings])

  return null
}

type LiveSiteSettingsResult =
  | { ok: true; siteSettings: SiteSettings | null }
  | { ok: false }

function siteSettingsFrom(data: unknown): LiveSiteSettingsResult {
  try {
    const siteSettings = resolveSiteSettings(
      draftSettingsSchema.parse(data).siteSettings,
    )
    return { ok: true, siteSettings }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Live draft Site Settings could not be resolved", error)
    }
    return { ok: false }
  }
}
