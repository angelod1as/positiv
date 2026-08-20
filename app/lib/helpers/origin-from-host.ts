/**
 * An origin built from the `Host` header, which carries neither a scheme nor a
 * trailing slash. What supabase is handed as a redirect has to be an exact
 * match for one of the urls it allows — anything else is quietly swapped for
 * the site url, and the person lands on the home page holding a code nothing
 * there reads.
 */
export const originFromHost = (host: string | null | undefined) => {
  if (!host) return ""

  const withScheme =
    host.startsWith("http://") || host.startsWith("https://")
      ? host
      : `${host.includes("localhost") ? "http://" : "https://"}${host}`

  return withScheme.replace(/\/+$/, "")
}
