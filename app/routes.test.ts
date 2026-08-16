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

  it("keeps the real routes in both environments", async () => {
    expect(await routesFor("production")).toContain("homepage")
    expect(await routesFor("development")).toContain("homepage")
  })
})
