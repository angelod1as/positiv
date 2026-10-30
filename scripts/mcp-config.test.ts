import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// .mcp.json is versioned in a public repository. Every server credential comes
// from the shell profile through ${VAR} expansion, never as a literal value.
const path = join(import.meta.dirname, "..", ".mcp.json")

type Server = { type?: string; url?: string; headers?: Record<string, string> }

function servers(): Record<string, Server> {
  return JSON.parse(readFileSync(path, "utf8")).mcpServers
}

describe(".mcp.json", () => {
  it("passes every header value through an environment variable", () => {
    for (const [name, server] of Object.entries(servers())) {
      for (const [header, value] of Object.entries(server.headers ?? {})) {
        expect(value, `${name} header ${header}`).toMatch(/^(Bearer )?\$\{[A-Z0-9_]+\}$/)
      }
    }
  })

  it("reaches the self-hosted Umami MCP endpoint with the read-only API key", () => {
    expect(servers().umami).toEqual({
      type: "http",
      url: "${POSITIV_UMAMI_URL}/mcp",
      headers: { Authorization: "Bearer ${POSITIV_UMAMI_API_KEY}" },
    })
  })
})
