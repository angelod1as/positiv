import { afterEach, describe, expect, it } from "vitest"
import { umamiRecorderLoaderScript } from "./recorder"

const UMAMI_URL = "https://umami.example.com"
const WEBSITE_ID = "test-website-id-123"

function runLoader() {
  new Function(umamiRecorderLoaderScript(UMAMI_URL, WEBSITE_ID))()
  return document.head.querySelector<HTMLScriptElement>(
    `script[src="${UMAMI_URL}/recorder.js"]`,
  )
}

describe("umamiRecorderLoaderScript", () => {
  afterEach(() => {
    document.head
      .querySelectorAll("script[src$='/recorder.js']")
      .forEach((script) => script.remove())
    window.localStorage.removeItem("umami.disabled")
    window.history.replaceState(null, "", "/")
  })

  it.each(["/", "/codigo-de-conduta", "/entrar", "/registrar"])(
    "loads the recorder for a visit that starts on %s",
    (path) => {
      window.history.replaceState(null, "", path)

      const recorder = runLoader()

      expect(recorder).not.toBeNull()
      expect(recorder?.getAttribute("data-website-id")).toBe(WEBSITE_ID)
      expect(recorder?.defer).toBe(true)
    },
  )

  // The recorder keeps the full address of the page a visit starts on, query
  // string included, and has no hook to mask it: a visit that starts on a
  // token link or inside the platform is never recorded.
  it.each([
    "/admin",
    "/admin/eventos/1",
    "/dashboard",
    "/dashboard/1/dados",
    "/conta/dados-basicos",
    "/pagamento/1",
    "/pagamento/t/abc123",
    "/convite/abc123",
    "/auth/confirm?token_hash=abc123",
    "/newsletter/unsubscribe?email=x",
    "/Admin",
    "/DASHBOARD/1/dados",
    "/Auth/confirm?token_hash=abc123",
    "/Pagamento/T/abc123",
  ])("does not load the recorder for a visit that starts on %s", (path) => {
    window.history.replaceState(null, "", path)

    expect(runLoader()).toBeNull()
  })

  it.each(["/administracao", "/contato", "/dashboards-publicos"])(
    "loads the recorder on %s, which only starts like a private path",
    (path) => {
      window.history.replaceState(null, "", path)

      expect(runLoader()).not.toBeNull()
    },
  )

  it("does not load the recorder once the visitor has opted out", () => {
    window.localStorage.setItem("umami.disabled", "1")

    expect(runLoader()).toBeNull()
  })

  it("cannot be closed early by a value that carries a closing script tag", () => {
    const script = umamiRecorderLoaderScript(
      "https://umami.example.com",
      "</script><script>alert(1)</script>",
    )

    expect(script).not.toContain("</script")
    expect(script).not.toContain("<!--")
  })
})

