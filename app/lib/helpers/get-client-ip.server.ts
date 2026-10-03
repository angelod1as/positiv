/**
 * The visitor's address, as Traefik — the Coolify proxy in front of the app —
 * saw it.
 *
 * Traefik trusts no forwarded headers from the internet, so it drops the
 * X-Real-Ip a client sends and writes the connection's own address there, and
 * appends that same address to X-Forwarded-For. Only the last entry of
 * X-Forwarded-For is the proxy's; anything before it is whatever the client
 * claimed.
 *
 * Nothing sets cf-connecting-ip: there is no Cloudflare in front of the app.
 */
export const getClientIp = (request: Request): string | null => {
  const realIp = request.headers.get("x-real-ip")?.trim()
  if (realIp) return realIp

  const lastForwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")
    .at(-1)
    ?.trim()

  return lastForwarded || null
}
