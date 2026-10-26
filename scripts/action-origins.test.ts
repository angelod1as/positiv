import { createRequestHandler, type ServerBuild } from "react-router"
import { describe, expect, it } from "vitest"
import config from "../react-router.config"

// react-router-serve does not trust the proxy, so behind Traefik `request.url`
// is http:// while the browser sends an https:// Origin. Since react-router
// 7.18 that mismatch fails every action with 400 unless the host is listed in
// `allowedActionOrigins`.
const build: ServerBuild = {
  entry: {
    module: {
      default: () => new Response(null, { status: 500 }),
    },
  },
  routes: {
    root: {
      id: "root",
      path: "",
      module: { default: () => null, action: () => ({ ok: true }) },
    },
  },
  assets: {
    entry: { imports: [], module: "" },
    routes: {},
    url: "",
    version: "",
    hmr: undefined,
  },
  publicPath: "/",
  assetsBuildDirectory: "",
  future: {
    v8_passThroughRequests: false,
    v8_trailingSlashAwareDataRequests: false,
    v8_middleware: false,
  },
  ssr: true,
  isSpaMode: false,
  prerender: [],
  routeDiscovery: { mode: "lazy", manifestPath: "/__manifest" },
  allowedActionOrigins: config.allowedActionOrigins,
}

const handler = createRequestHandler(build, "production")

function submitAction(host: string, origin: string) {
  return handler(
    new Request(`http://${host}/_root.data`, {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "intent=test",
    }),
  )
}

describe("action origins behind the HTTPS proxy", () => {
  it.each(["positivparty.com", "www.positivparty.com"])(
    "runs actions posted from https://%s",
    async (host) => {
      const response = await submitAction(host, `https://${host}`)

      expect(response.status).toBe(200)
    },
  )

  it("still rejects actions posted from a foreign origin", async () => {
    const response = await submitAction(
      "positivparty.com",
      "https://evil.example",
    )

    expect(response.status).toBe(400)
  })
})
