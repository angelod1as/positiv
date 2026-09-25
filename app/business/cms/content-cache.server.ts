import { logger } from "~/lib/logger/logger.server"

type ContentCacheOptions<T> = {
  name: string
  load: () => Promise<T>
  ttlMs?: number
}

export function createContentCache<T>({
  name,
  load,
  ttlMs = 60_000,
}: ContentCacheOptions<T>) {
  let cached: { value: T; loadedAt: number } | null = null
  let inFlight: Promise<T> | null = null

  async function reload(): Promise<T> {
    try {
      const value = await load()
      cached = { value, loadedAt: Date.now() }
      return value
    } catch (error) {
      if (!cached) throw error
      cached.loadedAt = Date.now()
      logger.error(`Could not reload the ${name} content, serving it stale`, {
        error: error instanceof Error ? error.message : String(error),
      })
      return cached.value
    }
  }

  return {
    get(): Promise<T> {
      if (cached && Date.now() - cached.loadedAt < ttlMs) {
        return Promise.resolve(cached.value)
      }
      inFlight ??= reload().finally(() => {
        inFlight = null
      })
      return inFlight
    },
    reset() {
      cached = null
      inFlight = null
    },
  }
}
