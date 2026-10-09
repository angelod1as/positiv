import { createQueryStore } from "@sanity/react-loader"

// client: false keeps a fetching client out of the browser bundle — in the
// browser the Studio pushes draft data over postMessage through useLiveMode, so
// no query ever reaches api.sanity.io from the client. ssr: true lets the
// server loader seed the first render with loadQuery.
export const { loadQuery, setServerClient, useQuery, useLiveMode } =
  createQueryStore({ client: false, ssr: true })
