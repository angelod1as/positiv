import { createClient } from "@sanity/client"
import { enableVisualEditing } from "@sanity/visual-editing"
import { useEffect, useMemo } from "react"
import type { LiveClientConfig } from "~/business/cms/live-loader"
import { useLiveMode } from "~/business/cms/live-loader"

// Live mode replaces the route revalidation that re-ran the loaders on every
// edit. enableVisualEditing draws the click-to-edit overlays; useLiveMode opens
// the comlink the Studio pushes draft data down, so an edit updates the preview
// over postMessage with no request to api.sanity.io. The client is publishable
// only — it never carries the Viewer token.
export function VisualEditing({
  clientConfig,
}: {
  clientConfig: LiveClientConfig
}) {
  const client = useMemo(
    () =>
      createClient({
        projectId: clientConfig.projectId,
        dataset: clientConfig.dataset,
        apiVersion: clientConfig.apiVersion,
        useCdn: false,
        ...(clientConfig.apiHost && {
          apiHost: clientConfig.apiHost,
          useProjectHostname: false,
        }),
      }),
    [clientConfig],
  )

  useEffect(() => enableVisualEditing(), [])
  useLiveMode({ client })

  return null
}
