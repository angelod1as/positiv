import { beforeEach, describe, expect, it, vi } from "vitest"
import { commitJson } from "./commit-json"

const onRedirect = vi.fn()

const answering = (response: Record<string, unknown>, url?: string) => {
  const json = vi.fn().mockResolvedValue(response)
  const fetchMock = vi.fn().mockResolvedValue({
    redirected: Boolean(url),
    url: url ?? "",
    json,
  })
  vi.stubGlobal("fetch", fetchMock)
  return { fetchMock, json }
}

describe("commitJson", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("posts the answers as json", async () => {
    const { fetchMock } = answering({ ok: true })

    await commitJson("/api/admin/event", { title: "Rapa do Tacho" }, onRedirect)

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Rapa do Tacho" }),
    })
  })

  it("answers with the verdict the route gave", async () => {
    answering({ ok: false, errors: [{ questionId: "emoji", message: "Não" }] })

    const result = await commitJson("/api/admin/event", {}, onRedirect)

    expect(result).toEqual({
      ok: false,
      errors: [{ questionId: "emoji", message: "Não" }],
    })
  })

  it("carries whatever else the route answered with", async () => {
    answering({ ok: true, id: "event-1" })

    const result = await commitJson<{ id: string }>(
      "/api/admin/event",
      {},
      onRedirect,
    )

    expect(result.ok).toBe(true)
    expect(result.id).toBe("event-1")
  })

  it("hands back the path a redirect landed on, and refuses", async () => {
    answering({ ok: true }, "http://localhost:3000/entrar?next=/admin")

    const result = await commitJson("/api/admin/event", {}, onRedirect)

    expect(onRedirect).toHaveBeenCalledWith("/entrar")
    expect(result).toEqual({ ok: false, errors: [] })
  })

  it("does not read a redirected response as a verdict", async () => {
    // The body of a followed redirect is a page of HTML. Reading it as JSON
    // would only say the save failed, when what someone needs is to sign in.
    const { json } = answering({ ok: true }, "http://localhost:3000/entrar")

    await commitJson("/api/admin/event", {}, onRedirect)

    expect(json).not.toHaveBeenCalled()
  })
})
