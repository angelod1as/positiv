import { afterEach, describe, expect, it, vi } from "vitest"
import { logger } from "~/lib/logger/logger.server"
import { rulesQuery } from "./rules-query"
import { getRules } from "./rules-source.server"

vi.mock("~/lib/logger/logger.server", () => ({ logger: { error: vi.fn() } }))

const rule = (key: string, title: string) => ({
  _key: key,
  title,
  body: [
    {
      _type: "block",
      _key: "p",
      style: "normal",
      markDefs: [],
      children: [{ _type: "span", _key: "s", text: "Texto.", marks: [] }],
    },
  ],
  highlight: null,
})

const part = (rules: unknown[]) => ({ title: null, subtitle: null, rules })

const rules = {
  generalRules: part([rule("g1", "Apenas SIM é SIM")]),
  agreements: part([rule("a1", "Pontualidade")]),
  privateRules: part([rule("p1", "A Positiv não é marmitaria")]),
}

function clientReturning(document: unknown) {
  return { fetch: vi.fn().mockResolvedValue(document) }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe("getRules", () => {
  it("reads the three parts with the Rules query", async () => {
    const client = clientReturning(rules)

    expect(await getRules(client)).toEqual(rules)
    expect(client.fetch).toHaveBeenCalledWith(rulesQuery)
  })

  it("returns null and logs when the Rules are not published", async () => {
    expect(await getRules(clientReturning(null))).toBeNull()
    expect(logger.error).toHaveBeenCalledWith("The Rules are not published")
  })

  it("returns null and logs why when the content breaks the contract", async () => {
    const untitled = { ...rule("p1", "x"), title: null }

    expect(
      await getRules(clientReturning({ ...rules, privateRules: part([untitled]) })),
    ).toBeNull()
    expect(logger.error).toHaveBeenCalledWith("The Rules failed validation", {
      error: expect.stringContaining("privateRules"),
    })
  })

  it("lets a Sanity failure reach the cache, which serves the last good Rules", async () => {
    const client = { fetch: vi.fn().mockRejectedValue(new Error("down")) }

    await expect(getRules(client)).rejects.toThrow("down")
  })
})
