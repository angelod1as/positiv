import { describe, expect, it } from "vitest"
import { loader } from "./sitemap[.xml]"

describe("sitemap.xml loader", () => {
  it("returns a Response with application/xml content type", async () => {
    const response = loader()

    expect(response).toBeInstanceOf(Response)
    expect(response.headers.get("Content-Type")).toBe("application/xml")
  })

  it("sets a public cache-control header", async () => {
    const response = loader()

    expect(response.headers.get("Cache-Control")).toBe("public, max-age=86400")
  })

  it("includes the homepage URL with priority 1.0", async () => {
    const response = loader()
    const body = await response.text()

    expect(body).toContain("<loc>https://positivparty.com/</loc>")
    expect(body).toContain("<priority>1.0</priority>")
  })

  it("includes the code of conduct URL with priority 0.7", async () => {
    const response = loader()
    const body = await response.text()

    expect(body).toContain(
      "<loc>https://positivparty.com/codigo-de-conduta</loc>",
    )
    expect(body).toContain("<priority>0.7</priority>")
  })

  it("includes the feedback URL with priority 0.5", async () => {
    const response = loader()
    const body = await response.text()

    expect(body).toContain("<loc>https://positivparty.com/feedback</loc>")
    expect(body).toContain("<priority>0.5</priority>")
  })

  it("returns a valid XML sitemap with urlset root element", async () => {
    const response = loader()
    const body = await response.text()

    expect(body).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(body).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    )
    expect(body).toContain("</urlset>")
  })
})
