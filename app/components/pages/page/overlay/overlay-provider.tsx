import type { createDataAttribute } from "@sanity/visual-editing"
import { useEffect, useMemo, useState } from "react"
import type { FCC } from "~types/utils/utils.types"
import { OverlayContext, type OverlayHelpers } from "./overlay-context"

type OverlayProviderProps = {
  pageId: string
  studioUrl: string
}

type CreateDataAttribute = typeof createDataAttribute

// createDataAttribute — and with it @sanity/visual-editing — is pulled in with a
// dynamic import, so it stays in its own chunk and never reaches the visitor
// bundle (the top-level import is a type, erased at build). The children render
// in a fixed tree position from the first paint; the context is null until the
// chunk resolves and then fills in, so draft preview never suspends or remounts.
export const OverlayProvider: FCC<OverlayProviderProps> = ({
  pageId,
  studioUrl,
  children,
}) => {
  const [create, setCreate] = useState<CreateDataAttribute | null>(null)

  useEffect(() => {
    let active = true
    import("@sanity/visual-editing")
      .then((module) => {
        if (active) setCreate(() => module.createDataAttribute)
      })
      .catch((error) => {
        console.error("Could not load the visual-editing overlay chunk", error)
      })
    return () => {
      active = false
    }
  }, [])

  const value = useMemo<OverlayHelpers | null>(() => {
    if (!create) return null
    return {
      pageId,
      dataAttribute: ({ type, id, path }) =>
        create({ baseUrl: studioUrl, id, type, path }).toString(),
    }
  }, [create, pageId, studioUrl])

  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>
}
