import type { QueryResponseInitial } from "@sanity/react-loader"
import { ENV } from "varlock/env"
import { createDraftReadClient } from "./draft-read-client.server"
import { loadQuery as serverLoadQuery, setServerClient } from "./live-loader"
import { SANITY_API_VERSION } from "./sanity-client.server"
import { siteSnapshotQuery } from "./site-snapshot-query"

export type LiveClientConfig = {
  projectId: string
  dataset: string
  apiVersion: string
  apiHost?: string
}

export type DraftSnapshotQuery = {
  initial: QueryResponseInitial<unknown>
  query: string
  params: Record<string, never>
  clientConfig: LiveClientConfig
}

type LoadQuery = typeof serverLoadQuery

// The draft read client is bound on first real use, not at import, so loading
// this module never needs the Viewer token or a configured projectId — tests
// that inject their own loadQuery never touch it.
let serverClientBound = false
function ensureServerClient(): void {
  if (serverClientBound) return
  setServerClient(createDraftReadClient())
  serverClientBound = true
}

// The published clientConfig that the browser needs to build image URLs and the
// live-mode client. projectId and dataset are not secret — they appear in every
// CDN image URL — and the Viewer token is deliberately left out so it never
// reaches the browser. Read at call time, so a runtime override still applies.
function liveClientConfig(): LiveClientConfig {
  return {
    projectId: ENV.SANITY_PROJECT_ID,
    dataset: ENV.SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    ...(ENV.SANITY_API_HOST && { apiHost: ENV.SANITY_API_HOST }),
  }
}

// The root and Page loaders both read the snapshot in one navigation. Memoise
// the draft query per request so a navigation costs a single api.sanity.io
// call; every later edit then arrives over postMessage, free of charge. React
// Router hands both loaders the same Request per navigation (single fetch); if
// that ever stops holding, the only cost is a second draft fetch.
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
