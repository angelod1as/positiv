import { createCookieSessionStorage } from "react-router"
import { ENV } from "varlock/env"

type DraftSessionData = { draft: true }

const isProduction = ENV.APP_ENV === "production"

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<DraftSessionData>({
    cookie: {
      name: "__sanity_preview",
      httpOnly: true,
      path: "/",
      // The Studio frames the app on a different origin, so the cookie set
      // during the handshake only rides the framed requests when SameSite is
      // None, which the browser allows only over HTTPS.
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
      secrets: [ENV.COOKIE_SECRET || ""],
    },
  })

function hasSecret(): boolean {
  return (ENV.COOKIE_SECRET || "").length > 0
}

export async function isDraftModeEnabled(request: Request): Promise<boolean> {
  // Without a secret the cookie would be signed with an empty key and anyone
  // could forge it, so draft mode stays off.
  if (!hasSecret()) return false
  try {
    const session = await getSession(request.headers.get("Cookie"))
    return session.get("draft") === true
  } catch {
    // A forged or corrupt cookie fails closed: the visitor sees published
    // content rather than a 500.
    return false
  }
}

export async function enableDraftMode(request: Request): Promise<string> {
  if (!hasSecret()) {
    throw new Error("COOKIE_SECRET must be set to enable draft mode")
  }
  const session = await getSession(request.headers.get("Cookie"))
  session.set("draft", true)
  return commitSession(session)
}

export async function disableDraftMode(request: Request): Promise<string> {
  const session = await getSession(request.headers.get("Cookie"))
  return destroySession(session)
}
