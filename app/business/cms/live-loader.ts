import { createQueryStore } from "@sanity/react-loader"

// The publishable config the browser needs to build image URLs and the
// live-mode client. It never carries the Viewer token. Defined here, in the
// non-.server module, so the browser can import the type without reaching into
// a server-only file.
export type LiveClientConfig = {
  projectId?: string
  dataset?: string
  apiVersion: string
  apiHost?: string
}

// client: false keeps a fetching client out of the browser bundle — in the
// browser the Studio pushes draft data over postMessage through useLiveMode, so
// no query ever reaches api.sanity.io from the client. ssr: true lets the
// server loader seed the first render with loadQuery.
export const { loadQuery, setServerClient, useQuery, useLiveMode } =
  createQueryStore({ client: false, ssr: true })
