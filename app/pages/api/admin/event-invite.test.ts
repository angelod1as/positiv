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

const EVENT_ID = "3f2c9a1e-5b7d-4c8e-9f10-2a3b4c5d6e7f"
const PROFILE_ID = "8a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d"
const INVITE_ID = "5d6e7f80-9a1b-4c2d-ae3f-4b5c6d7e8f90"

describe("the invite endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAdminContext.mockResolvedValue({})
    createInvite.mockResolvedValue({ id: "i1", token: "tok" })
    listInvitesForEvent.mockResolvedValue([])
    searchProfilesForInvite.mockResolvedValue([])
  })

  it("only answers an admin", async () => {
    await post({ intent: "search", eventId: EVENT_ID, term: "maria" })

    expect(getAdminContext).toHaveBeenCalled()
  })

  it("creates an invite", async () => {
    const response = await post({
      intent: "create",
      eventId: EVENT_ID,
      profileId: PROFILE_ID,
    })

    expect(createInvite).toHaveBeenCalledWith({
      eventId: EVENT_ID,
      profileId: PROFILE_ID,
    })
    expect(response.status).toBe(200)
  })

  it("revokes an invite", async () => {
    const response = await post({
      intent: "revoke",
      eventId: EVENT_ID,
      inviteId: INVITE_ID,
    })

    expect(revokeInvite).toHaveBeenCalledWith(EVENT_ID, INVITE_ID)
    expect(response.status).toBe(200)
  })

  it("searches", async () => {
    await post({ intent: "search", eventId: EVENT_ID, term: "maria" })

    expect(searchProfilesForInvite).toHaveBeenCalledWith(EVENT_ID, "maria")
  })

  it("answers a write with the event's invites, so nobody has to ask twice", async () => {
    listInvitesForEvent.mockResolvedValue([{ id: "i1", token: "tok" }])

    const response = await post({
      intent: "create",
      eventId: EVENT_ID,
      profileId: PROFILE_ID,
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
    const response = await post({ intent: "nonsense", eventId: EVENT_ID })

    expect(response.status).toBe(422)
    expect(createInvite).not.toHaveBeenCalled()
    expect(revokeInvite).not.toHaveBeenCalled()
  })

  it.each([
    { intent: "search", eventId: "eventos", term: "maria" },
    { intent: "create", eventId: "eventos", profileId: PROFILE_ID },
    { intent: "create", eventId: EVENT_ID, profileId: "perfil" },
    { intent: "revoke", eventId: "eventos", inviteId: INVITE_ID },
    { intent: "revoke", eventId: EVENT_ID, inviteId: "convite" },
  ])("refuses a non-uuid id before anything reaches the database: %o", async (body) => {
    const response = await post(body)

    expect(response.status).toBe(422)
    expect(searchProfilesForInvite).not.toHaveBeenCalled()
    expect(createInvite).not.toHaveBeenCalled()
    expect(revokeInvite).not.toHaveBeenCalled()
    expect(listInvitesForEvent).not.toHaveBeenCalled()
  })
})
