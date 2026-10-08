import { createCookieSessionStorage } from "react-router"
import { ENV } from "varlock/env"

type DraftSessionData = { draft: true }

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<DraftSessionData>({
    cookie: {
      name: "__sanity_preview",
      httpOnly: true,
      path: "/",
      secrets: [ENV.COOKIE_SECRET || ""],
    },
  })

function hasSecret(): boolean {
  return (ENV.COOKIE_SECRET || "").length > 0
}

// SameSite, Secure and Partitioned have to agree, and all three are read from
// the environment at call time so a server whose APP_ENV changes after this
// module loads cannot end up with a half-applied set. The Studio frames the app
// on a different origin, so in production the cookie is a third-party cookie:
// it only rides the framed requests when SameSite is None (which the browser
// allows only over HTTPS, hence Secure) and Chrome only stores it when it is
// also partitioned (CHIPS).
function cookieSecurity(): { sameSite: "none" | "lax"; secure: boolean } {
  const isProduction = ENV.APP_ENV === "production"
  return { sameSite: isProduction ? "none" : "lax", secure: isProduction }
}

// react-router's cookie serializer does not emit Partitioned, so append it to
// the Set-Cookie string. The attribute is ignored where it is not supported.
function withPartitioned(setCookie: string): string {
  return ENV.APP_ENV === "production" ? `${setCookie}; Partitioned` : setCookie
}

export async function isDraftModeEnabled(request: Request): Promise<boolean> {
  // Without a secret the cookie would be signed with an empty key and anyone
  // could forge it; without the token the draft loaders cannot read drafts.
  // Draft mode stays off in both cases.
  if (!hasSecret() || !ENV.SANITY_VIEWER_TOKEN) return false
  try {
    const session = await getSession(request.headers.get("Cookie"))
    return session.get("draft") === true
  } catch {
    // A forged or corrupt cookie fails closed: the visitor sees published
    // content rather than a 500.
    return false
  }
}

export async function applyDraftCacheControl(
  request: Request,
  headers: Headers,
): Promise<void> {
  // Draft content shares the published URL, so a shared cache in front of the
  // app must not store a draft render and hand it to visitors.
  if (await isDraftModeEnabled(request)) {
    headers.set("Cache-Control", "private, no-store")
  }
}

export async function enableDraftMode(request: Request): Promise<string> {
  if (!hasSecret()) {
    throw new Error("COOKIE_SECRET must be set to enable draft mode")
  }
  const session = await getSession(request.headers.get("Cookie"))
  session.set("draft", true)
  return withPartitioned(await commitSession(session, cookieSecurity()))
}

export async function disableDraftMode(request: Request): Promise<string> {
  const session = await getSession(request.headers.get("Cookie"))
  return withPartitioned(await destroySession(session, cookieSecurity()))
}
