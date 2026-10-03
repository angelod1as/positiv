import { createContentCache } from "./content-cache.server"
import { getPagesSnapshot } from "./pages-snapshot.server"

export const pagesSnapshotCache = createContentCache({
  name: "pages",
  load: () => getPagesSnapshot(),
})
