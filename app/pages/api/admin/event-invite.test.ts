import { beforeEach, describe, expect, it, vi } from "vitest"

const getAdminContext = vi.fn()
vi.mock("~/business/admin/admin.server", () => ({
  getAdminContext: (...args: unknown[]) => getAdminContext(...args),
}))

const createInvite = vi.fn()
const revokeInvite = vi.fn()
const listInvitesForEvent = vi.fn()
vi.mock("~/business/admin/event-invites.server", () => ({
  createInvite: (...args: unknown[]) => createInvite(...args),
  revokeInvite: (...args: unknown[]) => revokeInvite(...args),
  listInvitesForEvent: (...args: unknown[]) => listInvitesForEvent(...args),
}))

const searchProfilesForInvite = vi.fn()
vi.mock("~/business/admin/search-profiles.server", () => ({
  searchProfilesForInvite: (...args: unknown[]) =>
    searchProfilesForInvite(...args),
}))

import { action } from "./event-invite"

type ActionArgs = Parameters<typeof action>[0]

const call = (body: BodyInit) =>
  action({
    request: new Request("http://localhost:5173/api/admin/event-invite", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
    }),
    params: {},
  } as ActionArgs)

const post = (body: unknown) => call(JSON.stringify(body))

describe("the invite endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAdminContext.mockResolvedValue({})
    createInvite.mockResolvedValue({ id: "i1", token: "tok" })
    listInvitesForEvent.mockResolvedValue([])
    searchProfilesForInvite.mockResolvedValue([])
  })

  it("only answers an admin", async () => {
    await post({ intent: "search", eventId: "e1", term: "maria" })

    expect(getAdminContext).toHaveBeenCalled()
  })

  it("creates an invite", async () => {
    const response = await post({
      intent: "create",
      eventId: "e1",
      profileId: "p1",
    })

    expect(createInvite).toHaveBeenCalledWith({
      eventId: "e1",
      profileId: "p1",
    })
    expect(response.status).toBe(200)
  })

  it("revokes an invite", async () => {
    const response = await post({
      intent: "revoke",
      eventId: "e1",
      inviteId: "i1",
    })

    expect(revokeInvite).toHaveBeenCalledWith("i1")
    expect(response.status).toBe(200)
  })

  it("searches", async () => {
    await post({ intent: "search", eventId: "e1", term: "maria" })

    expect(searchProfilesForInvite).toHaveBeenCalledWith("e1", "maria")
  })

  it("answers a write with the event's invites, so nobody has to ask twice", async () => {
    listInvitesForEvent.mockResolvedValue([{ id: "i1", token: "tok" }])

    const response = await post({
      intent: "create",
      eventId: "e1",
      profileId: "p1",
    })

    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      invites: [{ id: "i1", token: "tok" }],
    })
  })

  it("refuses a body it cannot read", async () => {
    const response = await call("not json")

    expect(response.status).toBe(400)
  })

  it("refuses an unknown intent", async () => {
    const response = await post({ intent: "nonsense", eventId: "e1" })

    expect(response.status).toBe(422)
    expect(createInvite).not.toHaveBeenCalled()
    expect(revokeInvite).not.toHaveBeenCalled()
  })
})
