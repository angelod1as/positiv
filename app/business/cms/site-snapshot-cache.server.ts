import { createContentCache } from "./content-cache.server"
import { getSiteSnapshot } from "./site-snapshot.server"

export const siteSnapshotCache = createContentCache({
  name: "site",
  load: () => getSiteSnapshot(),
})
