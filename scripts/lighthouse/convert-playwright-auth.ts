import { composable, type Composable } from "composable-functions"
import { readFileSync } from "fs"
import { join } from "path"

interface PlaywrightCookie {
  name: string
  value: string
  domain: string
  path: string
  expires: number
  httpOnly: boolean
  secure: boolean
  sameSite: "Strict" | "Lax" | "None"
}

interface PlaywrightStorageState {
  cookies: PlaywrightCookie[]
  origins: unknown[]
}

/**
 * Read Playwright storage state and extract cookies as a formatted string
 * for use with Lighthouse --extra-headers option
 */
type GetAuthCookies = Composable<(authType: "user" | "admin") => string>

export const getAuthCookies: GetAuthCookies = composable((authType) => {
  const authFilePath = join(
    process.cwd(),
    "e2e",
    ".auth",
    `${authType}.json`,
  )

  const storageState: PlaywrightStorageState = JSON.parse(
    readFileSync(authFilePath, "utf-8"),
  )

  // Format cookies as "name=value; name2=value2"
  const cookieString = storageState.cookies
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ")

  return cookieString
})

/**
 * Get cookies as an array for Chrome DevTools Protocol
 */
type GetAuthCookiesArray = Composable<
  (authType: "user" | "admin") => PlaywrightCookie[]
>

export const getAuthCookiesArray: GetAuthCookiesArray = composable(
  (authType) => {
    const authFilePath = join(
      process.cwd(),
      "e2e",
      ".auth",
      `${authType}.json`,
    )

    const storageState: PlaywrightStorageState = JSON.parse(
      readFileSync(authFilePath, "utf-8"),
    )
    return storageState.cookies
  },
)

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const authType = (process.argv[2] as "user" | "admin") || "user"

  getAuthCookies(authType)
    .then((result) => {
      if (result.success) {
        console.info(`Cookies for ${authType}:`)
        console.info(result.data)
        process.exit(0)
      } else {
        console.error("Failed to extract cookies:", result.errors)
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error("Fatal error:", error)
      process.exit(1)
    })
}
