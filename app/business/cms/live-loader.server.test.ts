import { beforeEach, describe, expect, it, vi } from "vitest"
import { loadDraftSnapshotQuery } from "./live-loader.server"
import { siteSnapshotQuery } from "./site-snapshot-query"

const env = vi.hoisted<Record<string, unknown>>(() => ({}))

vi.mock("varlock/env", () => ({ ENV: env }))

beforeEach(() => {
  env.SANITY_PROJECT_ID = "8ojkallk"
  env.SANITY_DATASET = "development"
  env.SANITY_API_HOST = undefined
})

function fakeLoadQuery() {
  return vi.fn(async (query: string, params: unknown) => ({
    data: { query, params },
    sourceMap: undefined,
    tags: [],
  })) as unknown as Parameters<typeof loadDraftSnapshotQuery>[1]
}

describe("loadDraftSnapshotQuery", () => {
  it("loads the combined snapshot query with empty params", async () => {
    const loadQuery = fakeLoadQuery()

    const result = await loadDraftSnapshotQuery(new Request("http://x/"), loadQuery)

    expect(loadQuery).toHaveBeenCalledWith(siteSnapshotQuery, {})
    expect(result.query).toBe(siteSnapshotQuery)
    expect(result.params).toEqual({})
    expect(result.initial).toBeDefined()
  })

  it("carries the publishable client config, never the Viewer token", async () => {
    const result = await loadDraftSnapshotQuery(
      new Request("http://x/"),
      fakeLoadQuery(),
    )

    expect(result.clientConfig).toMatchObject({
      projectId: expect.any(String),
      dataset: expect.any(String),
      apiVersion: expect.any(String),
    })
    expect(JSON.stringify(result.clientConfig)).not.toMatch(/token/i)
  })

  it("fetches once per request, so a navigation costs a single API call", async () => {
    const request = new Request("http://x/")
    const loadQuery = fakeLoadQuery()

    const first = loadDraftSnapshotQuery(request, loadQuery)
    const second = loadDraftSnapshotQuery(request, loadQuery)

    expect(second).toBe(first)
    await Promise.all([first, second])
    expect(loadQuery).toHaveBeenCalledTimes(1)
  })

  it("fetches again for a different request", async () => {
    const loadQuery = fakeLoadQuery()

    await loadDraftSnapshotQuery(new Request("http://x/a"), loadQuery)
    await loadDraftSnapshotQuery(new Request("http://x/b"), loadQuery)

    expect(loadQuery).toHaveBeenCalledTimes(2)
  })

  it("memoises a rejected load per request, so the root and Page loaders share one failed fetch", async () => {
    const request = new Request("http://x/")
    const loadQuery = vi.fn(async () => {
      throw new Error("over quota")
    }) as unknown as Parameters<typeof loadDraftSnapshotQuery>[1]

    const first = loadDraftSnapshotQuery(request, loadQuery)
    const second = loadDraftSnapshotQuery(request, loadQuery)

    expect(second).toBe(first)
    await expect(first).rejects.toThrow("over quota")
    await expect(second).rejects.toThrow("over quota")
    expect(loadQuery).toHaveBeenCalledTimes(1)
  })
})
