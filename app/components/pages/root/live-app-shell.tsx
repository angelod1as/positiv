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

  const siteSettings = useMemo(() => siteSettingsFrom(data), [data])

  useEffect(() => {
    onSiteSettings(siteSettings)
  }, [siteSettings, onSiteSettings])

  return null
}

function siteSettingsFrom(data: unknown): SiteSettings | null {
  try {
    return resolveSiteSettings(draftSettingsSchema.parse(data).siteSettings)
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Live draft Site Settings could not be resolved", error)
    }
    return null
  }
}
