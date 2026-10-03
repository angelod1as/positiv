import { afterEach, describe, expect, it, vi } from "vitest"

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

  it("keeps the real routes in both environments", async () => {
    expect(await routesFor("production")).toContain("homepage")
    expect(await routesFor("development")).toContain("homepage")
  })
})
