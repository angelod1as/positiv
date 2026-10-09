import type { Page } from "./page.schema"
import {
  type ClientConfig,
  type PagesSnapshot,
  type SnapshotMode,
  resolvePagesSnapshot,
} from "./resolve-snapshot"

export type { ClientConfig, PagesSnapshot, SnapshotMode }
export { resolvePagesSnapshot }

export function findPage(
  snapshot: PagesSnapshot,
  address: string,
): Page | undefined {
  return snapshot.get(address.length > 1 ? address.replace(/\/$/, "") : address)
}
