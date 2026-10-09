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

  // The react-router component supplies the history adapter; refresh returns
  // false so live mode is the only update path — no revalidation, no API call.
  return <SanityVisualEditing refresh={() => false} />
}
