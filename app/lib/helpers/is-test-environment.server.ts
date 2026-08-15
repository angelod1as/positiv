import { ENV } from "varlock/env"

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