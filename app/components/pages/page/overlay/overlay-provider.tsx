import { createDataAttribute } from "@sanity/visual-editing"
import { useMemo } from "react"
import type { FCC } from "~types/utils/utils.types"
import { OverlayContext, type OverlayHelpers } from "./overlay-context"

type OverlayProviderProps = {
  pageId: string
  studioUrl: string
}

// Lazy-loaded in draft mode only, so createDataAttribute — and with it the
// @sanity/visual-editing dependency — stays out of the visitor bundle.
export const OverlayProvider: FCC<OverlayProviderProps> = ({
  pageId,
  studioUrl,
  children,
}) => {
  const value = useMemo<OverlayHelpers>(
    () => ({
      pageId,
      dataAttribute: ({ type, id, path }) =>
        createDataAttribute({ baseUrl: studioUrl, id, type, path }).toString(),
    }),
    [pageId, studioUrl],
  )

  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>
}
