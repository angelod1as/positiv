import { createDraftReadClient } from "./draft-read-client.server"
import { getSiteSnapshot, type SiteSnapshot } from "./site-snapshot.server"

export function getDraftSiteSnapshot(
  client = createDraftReadClient(),
): Promise<SiteSnapshot> {
  return getSiteSnapshot(client, "draft")
}
