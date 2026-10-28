export const UMAMI_BEFORE_SEND = "umamiBeforeSend"

export function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/")
}

// Leaving the tag off an admin page is not enough: the script loaded on a
// public page stays loaded and reports every client-side navigation, so an
// admin who signs in and lands on /admin would still be counted. Umami asks
// this hook before each send, and it refuses while the browser is on admin.
export const umamiBeforeSendScript = `window.${UMAMI_BEFORE_SEND} = function (type, payload) {
  var path = window.location.pathname
  return path === "/admin" || path.indexOf("/admin/") === 0 ? false : payload
}`
