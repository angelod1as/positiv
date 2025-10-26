import type { RequestLike } from "./is-test-environment.server"
import { isTestEnvironment } from "./is-test-environment.server"

export interface TurnstileConfig {
  siteKey: string
  secretKey: string
}

const TEST_SITE_KEY = "1x00000000000000000000AA"
const TEST_SECRET_KEY = "1x0000000000000000000000000000000AA"

export const getTurnstileConfig = (request?: RequestLike): TurnstileConfig => {
  if (isTestEnvironment(request)) {
    return {
      siteKey: TEST_SITE_KEY,
      secretKey: TEST_SECRET_KEY,
    }
  }

  const siteKey = process.env.VITE_TURNSTILE_SITE_KEY
  const secretKey = process.env.SUPABASE_TURNSTILE_SECRET

  if (!siteKey || !secretKey) {
    throw new Error(
      "Missing Turnstile keys. Set VITE_TURNSTILE_SITE_KEY and SUPABASE_TURNSTILE_SECRET environment variables.",
    )
  }

  return {
    siteKey,
    secretKey,
  }
}