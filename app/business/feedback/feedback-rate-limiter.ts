export interface RateLimiterConfig {
  windowMs?: number
}

const DEFAULT_WINDOW_MS = 30 * 60 * 1000

export class FeedbackRateLimiter {
  private requests: Map<string, number> = new Map()
  private windowMs: number

  constructor(config?: RateLimiterConfig) {
    this.windowMs = config?.windowMs ?? DEFAULT_WINDOW_MS
  }

  isRateLimited(ip: string): boolean {
    this.cleanup()
    const lastRequest = this.requests.get(ip)
    if (!lastRequest) {
      return false
    }
    return Date.now() - lastRequest < this.windowMs
  }

  recordRequest(ip: string): void {
    this.requests.set(ip, Date.now())
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [ip, timestamp] of this.requests.entries()) {
      if (now - timestamp >= this.windowMs) {
        this.requests.delete(ip)
      }
    }
  }
}
