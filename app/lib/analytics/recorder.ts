const asScriptLiteral = (value: string) =>
  JSON.stringify(value).replace(/</g, "\\u003c")

// The recorder behind Umami's replays and heatmaps keeps recording across
// client-side navigations, stores the full address with its query string and
// honours neither data-before-send nor any stop call. So it is only loaded for
// a visit that starts on the public site; a private area reached from there is
// hidden by Umami's Block Selector, `[data-umami-block]`.
//
// `umami.disabled` is the opt-out flag Umami's own tracker reads; the recorder
// does not, so the loader checks it.
//
// The script is emitted verbatim into an inline <script>, so the regex's
// slashes are escaped twice: once for this template string, once for the regex.
// The `i` flag matters: React Router matches paths regardless of case.
export function umamiRecorderLoaderScript(url: string, websiteId: string) {
  return `(function () {
  var privatePath = /^\\/(admin|dashboard|conta|pagamento|convite|auth|newsletter|emails)(\\/|$)/i
  if (privatePath.test(window.location.pathname)) return
  try {
    if (window.localStorage.getItem("umami.disabled")) return
  } catch (error) {}
  var script = document.createElement("script")
  script.defer = true
  script.src = ${asScriptLiteral(`${url}/recorder.js`)}
  script.setAttribute("data-website-id", ${asScriptLiteral(websiteId)})
  document.head.appendChild(script)
})()`
}
