import { createClient } from "@sanity/client"
import { ENV } from "varlock/env"
import { SANITY_API_VERSION } from "./sanity-client.server"

export function createDraftReadClient() {
  return createClient({
    projectId: ENV.SANITY_PROJECT_ID,
    dataset: ENV.SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    useCdn: false,
    perspective: "drafts",
    token: ENV.SANITY_VIEWER_TOKEN,
    ...(ENV.SANITY_API_HOST && {
      apiHost: ENV.SANITY_API_HOST,
      useProjectHostname: false,
    }),
  })
}
