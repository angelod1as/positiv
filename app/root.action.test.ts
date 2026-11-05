import { beforeEach, describe, expect, it, vi } from "vitest"

import { action } from "./root"

vi.mock("~/lib/logger/logger.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/lib/logger/logger.server")>()),
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("./business/auth/auth.server", () => ({
  getContext: vi.fn(),
}))

vi.mock("remix-toast", () => ({
  getToast: vi.fn(),
  redirectWithError: vi.fn(),
  redirectWithSuccess: vi.fn(),
}))

vi.mock("./business/session.server", () => ({
  newsCookie: { parse: vi.fn(), serialize: vi.fn() },
  newsletterPreferenceCookie: { parse: vi.fn(), serialize: vi.fn() },
}))

vi.mock("./business/newsletter/auto-subscribe.server", () => ({
  subscribeProfileToNewsletter: vi.fn(),
}))

function postForm(fields: Record<string, string>) {
  return new Request("http://localhost/", {
    method: "POST",
    body: new URLSearchParams(fields),
  })
}

async function rejection(promise: Promise<unknown>) {
  const thrown = await promise.then(
    () => undefined,
    (error: unknown) => error,
  )
  expect(thrown).toBeInstanceOf(Response)
  return thrown as Response
}

describe("root action", () => {
  beforeEach(async () => {
    const { newsCookie } = await import("./business/session.server")
    vi.mocked(newsCookie.parse).mockResolvedValue({})
    vi.mocked(newsCookie.serialize).mockResolvedValue("news=1")
  })

  it("answers a JSON POST with 415 instead of crashing", async () => {
    const request = new Request("http://localhost/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "news-update", thisUrl: "/" }),
    })

    const response = await rejection(
      action({ request, params: {} } as never),
    )

    expect(response.status).toBe(415)
  })

  it("still redirects a news-update form back to the page it came from", async () => {
    const response = (await action({
      request: postForm({
        intent: "news-update",
        thisUrl: "/eventos",
        newsVersion: "2",
      }),
      params: {},
    } as never)) as Response

    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/eventos")
  })
})
