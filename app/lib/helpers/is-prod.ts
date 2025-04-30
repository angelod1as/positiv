export function isProd() {
  if (process.env.CI === "true") return false
  if (process.env.NODE_ENV === "production") {
    return true
  }
  return false
}

export function isCI() {
  return process.env.CI === "true"
}
