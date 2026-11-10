import { ENV } from "varlock/env"

// NODE_ENV rather than APP_ENV on purpose: the question here is whether a test
// runner is executing this process, which is exactly what vitest sets NODE_ENV
// to. APP_ENV describes where the app is deployed, which is a different thing.

export interface RequestLike {
  ip?: string
  headers?: Record<string, string | undefined>
}

const TEST_IPS = ["127.0.0.1", "::1", "localhost"]

export const isTestEnvironment = (request?: RequestLike): boolean => {
  if (ENV.NODE_ENV === "test") {
    return true
  }

  if (request?.ip && TEST_IPS.includes(request.ip)) {
    return true
  }

  return false
}