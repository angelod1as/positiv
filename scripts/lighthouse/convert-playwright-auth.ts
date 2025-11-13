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
export function getAuthCookies(authType: "user" | "admin"): string {
  const authFilePath = join(
    process.cwd(),
    "e2e",
    ".auth",
    `${authType}.json`,
  )

  try {
    const storageState: PlaywrightStorageState = JSON.parse(
      readFileSync(authFilePath, "utf-8"),
    )

    // Format cookies as "name=value; name2=value2"
    const cookieString = storageState.cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ")

    return cookieString
  } catch (error) {
    console.error(`Error reading auth file for ${authType}:`, error)
    throw error
  }
}

/**
 * Get cookies as an array for Chrome DevTools Protocol
 */
export function getAuthCookiesArray(
  authType: "user" | "admin",
): PlaywrightCookie[] {
  const authFilePath = join(
    process.cwd(),
    "e2e",
    ".auth",
    `${authType}.json`,
  )

  try {
    const storageState: PlaywrightStorageState = JSON.parse(
      readFileSync(authFilePath, "utf-8"),
    )
    return storageState.cookies
  } catch (error) {
    console.error(`Error reading auth file for ${authType}:`, error)
    throw error
  }
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const authType = (process.argv[2] as "user" | "admin") || "user"

  try {
    const cookies = getAuthCookies(authType)
    console.log(`Cookies for ${authType}:`)
    console.log(cookies)
  } catch (error) {
    console.error("Failed to extract cookies")
    process.exit(1)
  }
}
