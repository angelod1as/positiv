import { ENV } from "varlock/env"

export function isProd() {
  if (ENV.CI) return false
  if (ENV.NODE_ENV === "production") {
    return true
  }
  return false
}

export function isCI() {
  return ENV.CI
}
