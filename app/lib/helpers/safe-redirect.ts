/**
 * Where to send someone after a sign-in, when the browser is the one asking.
 *
 * Taken at face value this is an open redirect: `/entrar?redirect_to=https://evil.example`
 * would have our own domain deposit a freshly signed-in person on somebody
 * else's site. Only a same-site absolute path survives -- one leading slash, no
 * scheme, no host, nothing a browser would read as either.
 */
export function safeRedirect(
  to: string | null | undefined,
  fallback: string,
): string {
  if (typeof to !== "string") return fallback

  const trimmed = to.trim()

  if (!trimmed.startsWith("/")) return fallback
  if (trimmed.startsWith("//")) return fallback
  if (trimmed.startsWith("/\\")) return fallback
  if (/[\n\r\t]/.test(trimmed)) return fallback

  return trimmed
}
