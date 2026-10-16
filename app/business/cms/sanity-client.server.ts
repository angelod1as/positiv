import { createClient } from "@sanity/client"
import { ENV } from "varlock/env"

export const SANITY_API_VERSION = "2026-09-24"

// The one place the Studio URL is read, so the draft read client and the live
// client config cannot drift apart. Read at call time, like every other ENV.
export function sanityStudioUrl(): string {
  return ENV.SANITY_STUDIO_URL
}

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
