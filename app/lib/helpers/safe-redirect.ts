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
  // Every control character, not only the whitespace a browser would strip: a
  // NUL or a C1 byte has no business in a path, and a header that carries one
  // is a header somebody built by hand.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f-\u009f]/.test(trimmed)) return fallback

  return trimmed
}
