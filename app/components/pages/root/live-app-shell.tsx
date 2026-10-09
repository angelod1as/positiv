import type { QueryResponseInitial } from "@sanity/react-loader"
import type { ReactNode } from "react"
import { useQuery } from "~/business/cms/live-loader"
import { resolveSiteSettings } from "~/business/cms/resolve-snapshot"
import type { SiteSettings } from "~/business/cms/site-settings.schema"
import { zod } from "~/lib/helpers/zod"

const draftSettingsSchema = zod.object({ siteSettings: zod.unknown() })

type LiveAppShellProps = {
  snapshot: {
    initial: QueryResponseInitial<unknown>
    query: string
    params: Record<string, never>
  }
  render: (siteSettings: SiteSettings | null) => ReactNode
}

// Subscribes to the same snapshot query the Page does, so the Studio pushes
// Site Settings edits over postMessage on the one live connection. A half-saved
// edit that fails validation falls back to the plain chrome rather than taking
// the whole preview down.
export function LiveAppShell({ snapshot, render }: LiveAppShellProps) {
  const { data } = useQuery<unknown>(snapshot.query, snapshot.params, {
    initial: snapshot.initial,
  })

  return <>{render(siteSettingsFrom(data))}</>
}

function siteSettingsFrom(data: unknown): SiteSettings | null {
  try {
    return resolveSiteSettings(draftSettingsSchema.parse(data).siteSettings)
  } catch {
    return null
  }
}
