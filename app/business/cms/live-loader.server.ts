import type { QueryResponseInitial } from "@sanity/react-loader"
import { ENV } from "varlock/env"
import { createDraftReadClient } from "./draft-read-client.server"
import {
  type LiveClientConfig,
  loadQuery as serverLoadQuery,
  setServerClient,
} from "./live-loader"
import { SANITY_API_VERSION } from "./sanity-client.server"
import { siteSnapshotQuery } from "./site-snapshot-query"

export type DraftSnapshotQuery = {
  initial: QueryResponseInitial<unknown>
  query: string
  params: Record<string, never>
  clientConfig: LiveClientConfig
}

type LoadQuery = typeof serverLoadQuery

// Bound on first real use, not at import, so loading the module needs no token
// or projectId and tests that inject their own loadQuery never touch it.
let serverClientBound = false
function ensureServerClient(): void {
  if (serverClientBound) return
  setServerClient(createDraftReadClient())
  serverClientBound = true
}

// projectId and dataset are not secret (they appear in every CDN image URL);
// the Viewer token is left out so it never reaches the browser. Read at call
// time so a runtime override still applies.
function liveClientConfig(): LiveClientConfig {
  return {
    projectId: ENV.SANITY_PROJECT_ID,
    dataset: ENV.SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    ...(ENV.SANITY_API_HOST && { apiHost: ENV.SANITY_API_HOST }),
  }
}

// Memoised per request so the root and Page loaders share one api.sanity.io
// call per navigation; later edits arrive over postMessage, free of charge.
// The key is the Request React Router hands every loader of a single
// navigation — it passes one instance to all of them, so the two loaders hit
// the same entry. If that ever stopped holding, the miss would cost a second
// fetch, never correctness.
const draftQueryByRequest = new WeakMap<Request, Promise<DraftSnapshotQuery>>()

export function loadDraftSnapshotQuery(
  request: Request,
  loadQuery: LoadQuery = serverLoadQuery,
): Promise<DraftSnapshotQuery> {
  const existing = draftQueryByRequest.get(request)
  if (existing) return existing

  const result = buildDraftSnapshotQuery(loadQuery)
  draftQueryByRequest.set(request, result)
  return result
}

async function buildDraftSnapshotQuery(
  loadQuery: LoadQuery,
): Promise<DraftSnapshotQuery> {
  if (loadQuery === serverLoadQuery) ensureServerClient()
  const params = {}
  const initial = await loadQuery(siteSnapshotQuery, params)
  return {
    initial,
    query: siteSnapshotQuery,
    params,
    clientConfig: liveClientConfig(),
  }
}
