import { logger } from "~/lib/logger/logger.server"
import { rulesCache } from "./rules-cache.server"
import type { Rules } from "./rules.schema"

export async function loadRules(): Promise<Rules | null> {
  try {
    return await rulesCache.get()
  } catch (error) {
    logger.error("Could not load the Rules", {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
