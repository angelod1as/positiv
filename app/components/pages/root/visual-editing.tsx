import { createClient } from "@sanity/client"
import { VisualEditing as SanityVisualEditing } from "@sanity/visual-editing/react-router"
import { useMemo } from "react"
import type { LiveClientConfig } from "~/business/cms/live-loader"
import { useLiveMode } from "~/business/cms/live-loader"

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

  useLiveMode({ client })

  // The react-router component wires the history adapter that keeps the Studio's
  // Presentation URL in step with in-preview navigation. refresh returns false
  // so live mode is the only update path: no loader revalidation, no request to
  // api.sanity.io per edit.
  return <SanityVisualEditing refresh={() => false} />
}
