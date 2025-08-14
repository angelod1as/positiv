interface RateLimiterOptions {
  maxRequests: number
  windowMs: number
}

interface ClientEntry {
  requests: number
  firstRequest: number
}

export class RateLimiter {
  private clients: Map<string, ClientEntry> = new Map()
  private maxRequests: number
  private windowMs: number
  private lastCleanup: number = Date.now()
  private cleanupInterval: number = 120000 // Clean up every 2 minutes

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests
    this.windowMs = options.windowMs
  }

  checkLimit(clientId: string): boolean {
    const now = Date.now()
    
    // Clean up old entries periodically
    if (now - this.lastCleanup > this.cleanupInterval) {
      this.cleanup(now)
      this.lastCleanup = now
    }

    const entry = this.clients.get(clientId)

    if (!entry) {
      // First request from this client
      this.clients.set(clientId, {
        requests: 1,
        firstRequest: now,
      })
      return true
    }

    // Check if the time window has passed
    if (now - entry.firstRequest > this.windowMs) {
      // Reset the client's count
      this.clients.set(clientId, {
        requests: 1,
        firstRequest: now,
      })
      return true
    }

    // Check if the client has exceeded the limit
    if (entry.requests >= this.maxRequests) {
      return false
    }

    // Increment the request count
    entry.requests++
    return true
  }

  getRemainingAttempts(clientId: string): number {
    const now = Date.now()
    const entry = this.clients.get(clientId)

    if (!entry) {
      return this.maxRequests
    }

    // Check if the time window has passed
    if (now - entry.firstRequest > this.windowMs) {
      return this.maxRequests
    }

    return Math.max(0, this.maxRequests - entry.requests)
  }

  getResetTime(clientId: string): number | null {
    const entry = this.clients.get(clientId)
    
    if (!entry) {
      return null
    }

    return entry.firstRequest + this.windowMs
  }

  private cleanup(now: number): void {
    for (const [clientId, entry] of this.clients.entries()) {
      if (now - entry.firstRequest > this.windowMs) {
        this.clients.delete(clientId)
      }
    }
  }
}