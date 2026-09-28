import { createClient } from "@sanity/client"
import { SANITY_API_VERSION } from "./sanity-client.server"

export function createProductionReadClient() {
  return createClient({
    projectId: "8ojkallk",
    dataset: "production",
    apiVersion: SANITY_API_VERSION,
    useCdn: true,
    perspective: "published",
  })
}
