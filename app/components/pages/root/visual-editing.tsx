import { createClient } from "@sanity/client"
import type { SuspiciousStegaReport } from "@sanity/visual-editing"
import { VisualEditing as SanityVisualEditing } from "@sanity/visual-editing/react-router"
import { useMemo } from "react"
import type { LiveClientConfig } from "~/business/cms/live-loader"
import { useLiveMode } from "~/business/cms/live-loader"
import { stegaFilter } from "~/business/cms/stega-filter"

// Only wired in development: it runs a DOM audit and warns when stega reaches an
// attribute, the <head> or a URL, which is where it always breaks something.
function reportSuspiciousStega(reports: SuspiciousStegaReport[]): void {
  for (const report of reports) {
    console.warn(`Stega found in ${report.kind}`, report)
  }
}

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
        // The same filter as the server fetch, so a live edit arrives encoded
        // exactly like the initial render and never breaks a link or a literal.
        stega: {
          enabled: true,
          studioUrl: clientConfig.studioUrl,
          filter: stegaFilter,
        },
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
  return (
    <SanityVisualEditing
      refresh={() => false}
      onSuspiciousStega={
        import.meta.env.DEV ? reportSuspiciousStega : undefined
      }
    />
  )
}
