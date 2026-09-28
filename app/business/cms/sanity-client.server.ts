import { createClient } from "@sanity/client"
import { ENV } from "varlock/env"

export const SANITY_API_VERSION = "2026-09-24"

export function createSanityClient() {
  return createClient({
    projectId: ENV.SANITY_PROJECT_ID,
    dataset: ENV.SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    useCdn: true,
    perspective: "published",
    ...(ENV.SANITY_API_HOST && {
      apiHost: ENV.SANITY_API_HOST,
      useProjectHostname: false,
    }),
  })
}
