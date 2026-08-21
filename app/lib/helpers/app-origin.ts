import { ENV } from "varlock/env"

const withoutTrailingSlash = (url: string) => url.replace(/\/+$/, "")

/**
 * The origin to build a link the app sends someone by e-mail.
 *
 * `APP_URL` first, because the `Host` header is whatever the request said it
 * was: a password reset built from it can be pointed at somebody else's server
 * by asking for one from there, and the link that arrives in the mailbox looks
 * exactly as legitimate as any other.
 *
 * Production never reads the header, configured or not. Without a url it
 * answers with nothing, so a deploy that forgot one sends a link that goes
 * nowhere rather than one that goes somewhere else. That used to be enforced by
 * refusing to boot, which took the site down over a variable only the e-mails
 * need.
 *
 * The header is the fallback for a development machine with nothing
 * configured, where it is the only thing that knows the port. It carries
 * neither a scheme nor a trailing slash, and what supabase is handed as a
 * redirect has to match one of the urls it allows exactly; anything else is
 * quietly swapped for the site url, and the person lands on the home page
 * holding a code nothing there reads.
 */
export const appOrigin = (host: string | null | undefined) => {
  const configured = ENV.APP_URL

  if (configured) return withoutTrailingSlash(configured)
  if (ENV.APP_ENV === "production") return ""
  if (!host) return ""

  const withScheme =
    host.startsWith("http://") || host.startsWith("https://")
      ? host
      : `${host.includes("localhost") ? "http://" : "https://"}${host}`

  return withoutTrailingSlash(withScheme)
}
