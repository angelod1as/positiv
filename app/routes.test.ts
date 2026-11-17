import { afterEach, describe, expect, it, vi } from "vitest"
import { umamiRecorderLoaderScript } from "~/lib/analytics/recorder"

async function routesFor(nodeEnv: string) {
  vi.stubEnv("NODE_ENV", nodeEnv)
  vi.resetModules()
  const routes = (await import("./routes")).default
  return JSON.stringify(routes)
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe("route config", () => {
  it("leaves the form runtime demo out of a production build", async () => {
    expect(await routesFor("production")).not.toContain("form-runtime")
  })

  it("serves the form runtime demo in development", async () => {
    expect(await routesFor("development")).toContain("form-runtime")
  })

  it("centres the payment pages like the other participant pages", async () => {
    vi.resetModules()
    const routes = (await import("./routes")).default

    type Route = { file: string; children?: Route[] }
    const parentOf = (file: string, nodes: Route[], parent?: Route): Route | undefined => {
      for (const node of nodes) {
        if (node.file === file) return parent
        const found = parentOf(file, node.children ?? [], node)
        if (found) return found
      }
    }

    for (const page of [
      "pages/payment/payment-page.tsx",
      "pages/payment/payment-thanks-page.tsx",
    ]) {
      expect(parentOf(page, routes as Route[])?.file).toBe(
        "pages/payment/layout.tsx",
      )
    }
  })

  it.each(["production", "development"])(
    "serves Pages through a splat route registered after every other route in %s",
    async (nodeEnv) => {
      vi.stubEnv("NODE_ENV", nodeEnv)
      vi.resetModules()
      const routes = (await import("./routes")).default as {
        path?: string
        file: string
      }[]

      expect(routes.at(-1)).toMatchObject({
        path: "*",
        file: "pages/page/page.tsx",
      })
      expect(routes.filter((route) => route.path === "*")).toHaveLength(1)
    },
  )

  it("serves / through the Page route", async () => {
    vi.resetModules()
    const routes = (await import("./routes")).default as {
      index?: boolean
      id?: string
      file: string
    }[]

    expect(routes.find((route) => route.index)).toMatchObject({
      id: "homepage",
      file: "pages/page/page.tsx",
    })
  })

  it("keeps the real routes in both environments", async () => {
    expect(await routesFor("production")).toContain("homepage")
    expect(await routesFor("development")).toContain("homepage")
  })

  // The Block Selector hides what is behind the guards once a recorded visit
  // gets there; a visit that starts there must not be recorded at all, since
  // the recorder keeps the full address. The loader's list of private paths is
  // written by hand, so every guarded route is checked against it.
  it("never records a visit that starts on a page behind the private or admin guard", async () => {
    vi.resetModules()
    const routes = (await import("./routes")).default

    type Route = { file: string; path?: string; children?: Route[] }
    const guards = ["pages/guard/private.tsx", "pages/guard/admin.tsx"]
    const guarded: string[] = []
    const walk = (nodes: Route[], base: string, behindGuard: boolean) => {
      for (const node of nodes) {
        const path = node.path
          ? `${base}/${node.path}`.replace(/\/+/g, "/")
          : base
        const isBehind = behindGuard || guards.includes(node.file)
        if (isBehind && !node.children) guarded.push(path)
        walk(node.children ?? [], path, isBehind)
      }
    }
    walk(routes as Route[], "", false)

    const recorded = guarded.filter((path) => {
      window.history.replaceState(null, "", path.replace(/:\w+\??/g, "x"))
      new Function(umamiRecorderLoaderScript("https://umami.example.com", "id"))()
      const recorder = document.head.querySelector("script[src$='/recorder.js']")
      recorder?.remove()
      return recorder !== null
    })
    window.history.replaceState(null, "", "/")

    expect(guarded.length).toBeGreaterThan(10)
    expect(recorded).toEqual([])
  })
})

