// A stand-in for Sanity's Query API, started next to the production build under
// test so the suite never reads a real dataset. The app's client, given a custom
// apiHost, sends every query — CDN or not — to
// GET <apiHost>/v<apiVersion>/data/query/<dataset>?query=…, and this answers the
// homepage and pages queries there with the recorded fixtures.
import { readFileSync } from "node:fs"
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import type { AddressInfo } from "node:net"
import { join } from "node:path"
import { homepageQuery } from "../../app/business/cms/homepage-query"
import { pagesQuery } from "../../app/business/cms/pages-query"
import { SANITY_API_VERSION } from "../../app/business/cms/sanity-client.server"

export const E2E_SANITY_PROJECT_ID = "e2emock"
export const E2E_SANITY_DATASET = "e2e"

// Read rather than imported: Playwright loads this file as native ESM, where a
// JSON import needs an import attribute the project's TypeScript target rejects.
function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(process.cwd(), "e2e", "fixtures", name), "utf8"))
}

const RESULTS = new Map<string, unknown>([
  [homepageQuery, readFixture("homepage-content.json")],
  [pagesQuery, readFixture("pages-snapshot.json")],
])

let server: Server | null = null

function send(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status
  response.setHeader("Content-Type", "application/json")
  response.end(JSON.stringify(body))
}

function handle(request: IncomingMessage, response: ServerResponse) {
  const method = request.method ?? "GET"
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`)

  if (method !== "GET" || url.pathname !== `/v${SANITY_API_VERSION}/data/query/${E2E_SANITY_DATASET}`) {
    return send(response, 404, { error: "Not Found", message: `No mock for ${method} ${url.pathname}` })
  }

  const query = url.searchParams.get("query") ?? ""
  if (!RESULTS.has(query)) {
    return send(response, 400, {
      error: { query, description: "No mock for this query", type: "queryParseError" },
    })
  }

  const returnQuery = url.searchParams.get("returnQuery") !== "false"
  send(response, 200, { result: RESULTS.get(query), ms: 1, ...(returnQuery && { query }) })
}

export function startSanityMockServer(port: number): Promise<string> {
  const listening = createServer(handle)
  server = listening

  return new Promise((resolve, reject) => {
    listening.once("error", reject)
    listening.listen(port, "127.0.0.1", () => {
      resolve(`http://127.0.0.1:${(listening.address() as AddressInfo).port}`)
    })
  })
}

export function stopSanityMockServer(): Promise<void> {
  const closing = server
  server = null
  return new Promise((resolve) => (closing ? closing.close(() => resolve()) : resolve()))
}
