import { isDraftModeEnabled } from "./draft-mode.server"
import { getDraftSiteSnapshot } from "./draft-snapshot.server"
import { siteSnapshotCache } from "./site-snapshot-cache.server"
import type { SiteSnapshot } from "./site-snapshot.server"

// The root and Page loaders both read the snapshot in one navigation. The
// published path already shares a cached value; the draft path has no cache, so
// memoise it per request to keep a navigation to a single Sanity round-trip.
const draftSnapshotByRequest = new WeakMap<Request, Promise<SiteSnapshot>>()

function draftSnapshotFor(request: Request): Promise<SiteSnapshot> {
  const existing = draftSnapshotByRequest.get(request)
  if (existing) return existing

  const snapshot = getDraftSiteSnapshot()
  draftSnapshotByRequest.set(request, snapshot)
  return snapshot
}

export async function loadSiteSnapshot(
  request: Request,
): Promise<SiteSnapshot> {
  if (await isDraftModeEnabled(request)) {
    return draftSnapshotFor(request)
  }
  return siteSnapshotCache.get()
}
