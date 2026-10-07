import { isDraftModeEnabled } from "./draft-mode.server"
import { getDraftSiteSnapshot } from "./draft-snapshot.server"
import { siteSnapshotCache } from "./site-snapshot-cache.server"
import type { SiteSnapshot } from "./site-snapshot.server"

export async function loadSiteSnapshot(
  request: Request,
): Promise<SiteSnapshot> {
  if (await isDraftModeEnabled(request)) {
    return getDraftSiteSnapshot()
  }
  return siteSnapshotCache.get()
}
