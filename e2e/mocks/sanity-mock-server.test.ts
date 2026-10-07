import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { createSanityClient, SANITY_API_VERSION } from "../../app/business/cms/sanity-client.server"
import { siteSnapshotQuery } from "../../app/business/cms/site-snapshot-query"
import pagesFixture from "../fixtures/pages-snapshot.json"
import siteSettingsFixture from "../fixtures/site-settings.json"
import {
  E2E_SANITY_DATASET,
  E2E_SANITY_PROJECT_ID,
  startSanityMockServer,
  stopSanityMockServer,
} from "./sanity-mock-server"

const env = vi.hoisted<Record<string, unknown>>(() => ({}))

vi.mock("varlock/env", () => ({ ENV: env }))

const snapshot = { pages: pagesFixture, siteSettings: siteSettingsFixture }

let origin: string

beforeAll(async () => {
  origin = await startSanityMockServer(0)
})

afterAll(async () => {
  await stopSanityMockServer()
})

function queryUrl(query: string, dataset = E2E_SANITY_DATASET) {
  const params = new URLSearchParams({ query, perspective: "published" })
  return `${origin}/v${SANITY_API_VERSION}/data/query/${dataset}?${params}`
}

describe("sanity mock server", () => {
  it("answers the site snapshot query with the fixtures, in the Query API envelope", async () => {
    const response = await fetch(queryUrl(siteSnapshotQuery))

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toMatch(/^application\/json/)
    expect(await response.json()).toEqual({ result: snapshot, ms: 1, query: siteSnapshotQuery })
  })

  it("leaves the query out of the envelope when asked to, as the client does", async () => {
    const response = await fetch(`${queryUrl(siteSnapshotQuery)}&returnQuery=false`)

    expect(await response.json()).toEqual({ result: snapshot, ms: 1 })
  })

  it("refuses a query it has no answer for, rather than returning null for it", async () => {
    const response = await fetch(queryUrl('*[_type == "event"]'))

    expect(response.status).toBe(400)
    expect((await response.json()).error.type).toBe("queryParseError")
  })

  it("does not serve a dataset other than the e2e one", async () => {
    const response = await fetch(queryUrl(siteSnapshotQuery, "production"))

    expect(response.status).toBe(404)
  })

  it("does not serve an api version the client is not pinned to", async () => {
    const params = new URLSearchParams({ query: siteSnapshotQuery })
    const response = await fetch(`${origin}/v2021-10-21/data/query/${E2E_SANITY_DATASET}?${params}`)

    expect(response.status).toBe(404)
  })

  it("answers 404 on a path it does not know", async () => {
    const response = await fetch(`${origin}/v${SANITY_API_VERSION}/data/mutate/${E2E_SANITY_DATASET}`)

    expect(response.status).toBe(404)
  })

  it("hands the app's own client the fixture when SANITY_API_HOST points at it", async () => {
    env.SANITY_PROJECT_ID = E2E_SANITY_PROJECT_ID
    env.SANITY_DATASET = E2E_SANITY_DATASET
    env.SANITY_API_HOST = origin

    const content = await createSanityClient().fetch(siteSnapshotQuery)

    expect(content).toEqual(snapshot)
  })
})
