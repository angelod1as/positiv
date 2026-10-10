import { createQueryStore } from "@sanity/react-loader"

// The publishable config the browser needs; it never carries the Viewer token.
export type LiveClientConfig = {
  projectId?: string
  dataset?: string
  apiVersion: string
  apiHost?: string
  studioUrl: string
}

// client: false keeps a fetching client out of the browser bundle, so no query
// reaches api.sanity.io from the client; the Studio pushes draft data over
// postMessage through useLiveMode instead. ssr: true seeds the first render.
export const { loadQuery, setServerClient, useQuery, useLiveMode } =
  createQueryStore({ client: false, ssr: true })
