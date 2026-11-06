export const UMAMI_BEFORE_SEND = "umamiBeforeSend"

export function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/")
}

// Leaving the tag off an admin page is not enough: the script loaded on a
// public page stays loaded and reports every client-side navigation, so an
// admin who signs in and lands on /admin would still be counted. Umami asks
// this hook before each send, and it refuses while the browser is on admin.
//
// It also masks the token in a payment or invite link, in the url and in the
// referrer Umami carries over from the previous page: the token is the whole
// authorization for that page, and analytics would keep it for anyone with
// access to read.
export const umamiBeforeSendScript = `window.${UMAMI_BEFORE_SEND} = function (type, payload) {
  var path = window.location.pathname
  if (path === "/admin" || path.indexOf("/admin/") === 0) return false
  var token = new RegExp("/(pagamento/t|convite)/[^/?#]+", "g")
  var mask = function (value) {
    return typeof value === "string" ? value.replace(token, "/$1/:token") : value
  }
  if (payload && typeof payload === "object") {
    if ("url" in payload) payload.url = mask(payload.url)
    if ("referrer" in payload) payload.referrer = mask(payload.referrer)
  }
  return payload
}`
