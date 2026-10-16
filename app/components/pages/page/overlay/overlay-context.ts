import { createContext, useContext } from "react"

// The page document id is shared, so a Section or an image overlay only has to
// name its own path. The builder is provided by the lazy draft chunk, so this
// module never pulls @sanity/visual-editing into the visitor bundle.
export type OverlayHelpers = {
  pageId: string
  dataAttribute: (target: { type: string; id: string; path: string }) => string
}

export const OverlayContext = createContext<OverlayHelpers | null>(null)

export function useOverlay(): OverlayHelpers | null {
  return useContext(OverlayContext)
}
