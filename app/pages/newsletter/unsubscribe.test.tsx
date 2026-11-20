import { describe, expect, it } from "vitest"
import { loader } from "./unsubscribe"

const load = (url: string) =>
  loader({
    request: new Request(url),
    params: {},
    context: {} as never,
    url: new URL(url),
    pattern: "/newsletter/unsubscribe",
  } as Parameters<typeof loader>[0])

describe("old unsubscribe link", () => {
  it("sends the person to Seus e-mails, dropping the bare profile id", async () => {
    const response = (await load(
      "http://localhost/newsletter/unsubscribe?id=11111111-1111-4111-8111-111111111111&utm_source=email",
    )) as Response

    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/emails?utm_source=email")
  })

  it("redirects a link with nothing on it too", async () => {
    const response = (await load(
      "http://localhost/newsletter/unsubscribe",
    )) as Response

    expect(response.headers.get("Location")).toBe("/emails")
  })
})
