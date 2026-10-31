import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"
import { closeTickets, keysIn } from "./jira-close-on-merge"

const apiBase = "https://jira.example/ex/jira/cloud"
const authorization = "Basic c2VjcmV0"

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 })
}

function jira({
  transitions = [
    { id: "31", to: { name: "Em revisão" } },
    { id: "41", to: { name: "Feito" } },
    { id: "51", to: { name: "Cancelado" } },
  ],
  listStatus = 200,
  postStatus = 204,
} = {}) {
  return vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === "POST") return new Response(null, { status: postStatus })
    if (listStatus !== 200) return new Response(null, { status: listStatus })
    return json({ transitions })
  })
}

function postBodies(fetcher: ReturnType<typeof jira>) {
  return fetcher.mock.calls
    .filter(([, init]) => init?.method === "POST")
    .map(([url, init]) => [url, JSON.parse(String(init?.body))])
}

describe("keysIn", () => {
  it("reads a single key from a PR title", () => {
    expect(keysIn("[WEB-12] Add the thing")).toEqual(["WEB-12"])
  })

  it("reads every key from a multi-ticket title, once each", () => {
    expect(keysIn("[WEB-12, WEB-13] Fix WEB-12 again")).toEqual([
      "WEB-12",
      "WEB-13",
    ])
  })

  it("ignores keys of other projects and lookalikes", () => {
    expect(keysIn("[POS-681] Fix NOTWEB-1 and WEB-")).toEqual([])
  })
})

describe("closeTickets", () => {
  it("moves the ticket through the transition that leads to Feito", async () => {
    const fetcher = jira()

    await closeTickets({
      title: "[WEB-12] Add the thing",
      apiBase,
      authorization,
      fetcher,
    })

    expect(postBodies(fetcher)).toEqual([
      [
        `${apiBase}/rest/api/3/issue/WEB-12/transitions`,
        { transition: { id: "41" } },
      ],
    ])
  })

  it("sends the credentials on every request", async () => {
    const fetcher = jira()

    await closeTickets({ title: "[WEB-12] x", apiBase, authorization, fetcher })

    for (const [, init] of fetcher.mock.calls) {
      expect(new Headers(init?.headers).get("Authorization")).toBe(authorization)
    }
  })

  it("closes every ticket of a multi-ticket title", async () => {
    const fetcher = jira()

    await closeTickets({
      title: "[WEB-12, WEB-13] Both",
      apiBase,
      authorization,
      fetcher,
    })

    expect(postBodies(fetcher).map(([url]) => url)).toEqual([
      `${apiBase}/rest/api/3/issue/WEB-12/transitions`,
      `${apiBase}/rest/api/3/issue/WEB-13/transitions`,
    ])
  })

  it("does nothing, and needs no credentials, for a title without a key", async () => {
    const fetcher = jira()

    await closeTickets({
      title: "[POS-681] Old ticket",
      apiBase,
      authorization: undefined,
      fetcher,
    })

    expect(fetcher).not.toHaveBeenCalled()
  })

  it("fails when the project has no transition to Feito", async () => {
    const fetcher = jira({
      transitions: [{ id: "51", to: { name: "Cancelado" } }],
    })

    await expect(
      closeTickets({ title: "[WEB-12] x", apiBase, authorization, fetcher }),
    ).rejects.toThrow("No transition to Feito for WEB-12")
  })

  it("fails on an expired or wrong token, which is how we learn it lapsed", async () => {
    const fetcher = jira({ listStatus: 401 })

    await expect(
      closeTickets({ title: "[WEB-12] x", apiBase, authorization, fetcher }),
    ).rejects.toThrow("Listing transitions for WEB-12 returned HTTP 401")
  })

  it("fails when Jira refuses the transition", async () => {
    const fetcher = jira({ postStatus: 400 })

    await expect(
      closeTickets({ title: "[WEB-12] x", apiBase, authorization, fetcher }),
    ).rejects.toThrow("Moving WEB-12 to Feito returned HTTP 400")
  })

  it("still tries the other tickets before reporting a failure", async () => {
    const fetcher = jira({ postStatus: 400 })

    await expect(
      closeTickets({
        title: "[WEB-12, WEB-13] x",
        apiBase,
        authorization,
        fetcher,
      }),
    ).rejects.toThrow("WEB-13")

    expect(postBodies(fetcher)).toHaveLength(2)
  })
})

describe("jira close on merge workflow", () => {
  const workflow = readFileSync(
    join(
      import.meta.dirname,
      "..",
      ".github",
      "workflows",
      "jira-close-on-merge.yml",
    ),
    "utf8",
  )

  it("runs only for pull requests merged into main", () => {
    expect(workflow).toContain("types: [closed]")
    expect(workflow).toMatch(/branches:\n\s+- main/)
    expect(workflow).toContain("github.event.pull_request.merged == true")
  })

  it("keeps the title out of the shell, where it could inject commands", () => {
    // Anyone who can open a pull request chooses its title.
    expect(workflow).not.toMatch(/run:.*github\.event/)
    expect(workflow).toContain("PR_TITLE: ${{ github.event.pull_request.title }}")
  })

  it("gives the job's token no permissions", () => {
    expect(workflow).toContain("permissions: {}")
  })
})
