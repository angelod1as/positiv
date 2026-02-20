import { describe, expect, it } from "vitest"
import { loader } from "./robots[.txt]"

describe("robots.txt loader", () => {
  it("returns a Response with text/plain content type", async () => {
    const response = loader()

    expect(response).toBeInstanceOf(Response)
    expect(response.headers.get("Content-Type")).toBe("text/plain")
  })

  it("sets a public cache-control header", async () => {
    const response = loader()

    expect(response.headers.get("Cache-Control")).toBe("public, max-age=86400")
  })

  it("allows all user agents", async () => {
    const response = loader()
    const body = await response.text()

    expect(body).toContain("User-agent: *")
    expect(body).toContain("Allow: /")
  })

  it("disallows admin routes", async () => {
    const response = loader()
    const body = await response.text()

    expect(body).toContain("Disallow: /admin")
  })

  it("includes a Sitemap directive pointing to sitemap.xml", async () => {
    const response = loader()
    const body = await response.text()

    expect(body).toContain(
      "Sitemap: https://positivparty.com/sitemap.xml",
    )
  })
})
