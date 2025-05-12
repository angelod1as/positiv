import { env } from "~/env.server"

export function isProd() {
  if (env().ci === "true") return false
  if (env().nodeEnv === "production") {
    return true
  }
  return false
}

export function isCI() {
  return env().ci === "true"
}
