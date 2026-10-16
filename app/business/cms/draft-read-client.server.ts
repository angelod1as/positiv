import { createClient } from "@sanity/client"
import { ENV } from "varlock/env"
import { SANITY_API_VERSION, sanityStudioUrl } from "./sanity-client.server"
import { stegaFilter } from "./stega-filter"

export function createDraftReadClient() {
  return createClient({
    projectId: ENV.SANITY_PROJECT_ID,
    dataset: ENV.SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    useCdn: false,
    perspective: "drafts",
    token: ENV.SANITY_VIEWER_TOKEN,
    stega: {
      enabled: true,
      studioUrl: sanityStudioUrl(),
      filter: stegaFilter,
    },
    ...(ENV.SANITY_API_HOST && {
      apiHost: ENV.SANITY_API_HOST,
      useProjectHostname: false,
    }),
  })
}
