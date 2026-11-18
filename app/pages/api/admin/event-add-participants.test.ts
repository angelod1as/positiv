import { beforeEach, describe, expect, it, vi } from "vitest"
import { PERMISSIONS } from "~/business/auth/permissions"

const getAdminContext = vi.fn()
vi.mock("~/business/auth/admin-context.server", () => ({
  getAdminContext: (...args: unknown[]) => getAdminContext(...args),
}))

const requirePermission = vi.fn()
vi.mock("~/business/auth/guards.server", () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}))

const addParticipantsDirectly = vi.fn()
vi.mock("~/business/application/add-participants-directly.server", async () => {
  const actual = await vi.importActual<
    typeof import("~/business/application/add-participants-directly.server")
  >("~/business/application/add-participants-directly.server")
  return {
    EventNotAcceptingAdditionsError: actual.EventNotAcceptingAdditionsError,
    addParticipantsDirectly: (...args: unknown[]) =>
      addParticipantsDirectly(...args),
  }
})

const searchProfilesForInvite = vi.fn()
vi.mock("~/business/reporting/search-profiles.server", () => ({
  searchProfilesForInvite: (...args: unknown[]) =>
    searchProfilesForInvite(...args),
}))

import { EventNotAcceptingAdditionsError } from "~/business/application/add-participants-directly.server"
import { action } from "./event-add-participants"

type ActionArgs = Parameters<typeof action>[0]

const call = (body: BodyInit) =>
  action({
    request: new Request(
      "http://localhost:5173/api/admin/event-add-participants",
      {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
      },
    ),
    params: {},
  } as ActionArgs)

const post = (body: unknown) => call(JSON.stringify(body))

const EVENT_ID = "3f2c9a1e-5b7d-4c8e-9f10-2a3b4c5d6e7f"
const PROFILE_ID = "8a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d"
const CURRENT_PROFILE = { id: "admin", permissions: [] }

describe("the add participants endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAdminContext.mockResolvedValue({ currentProfile: CURRENT_PROFILE })
    requirePermission.mockResolvedValue(CURRENT_PROFILE)
    addParticipantsDirectly.mockResolvedValue([])
    searchProfilesForInvite.mockResolvedValue([])
  })

  it("asks for the permission to add participants directly", async () => {
    await post({ intent: "search", eventId: EVENT_ID, term: "maria" })

    expect(getAdminContext).toHaveBeenCalled()
    expect(requirePermission).toHaveBeenCalledWith(
      CURRENT_PROFILE,
      PERMISSIONS.PARTICIPANTS_ADD_DIRECTLY,
    )
  })

  it("adds nobody when the permission is missing", async () => {
    const refusal = new Response(null, { status: 302 })
    requirePermission.mockRejectedValue(refusal)

    await expect(
      post({
        intent: "add",
        eventId: EVENT_ID,
        people: [{ profileId: PROFILE_ID, spotType: "regular" }],
      }),
    ).rejects.toBe(refusal)
    expect(addParticipantsDirectly).not.toHaveBeenCalled()
  })

  it("searches only profiles that may be added", async () => {
    searchProfilesForInvite.mockResolvedValue([{ id: PROFILE_ID }])

    const response = await post({
      intent: "search",
      eventId: EVENT_ID,
      term: "maria",
    })

    expect(searchProfilesForInvite).toHaveBeenCalledWith(EVENT_ID, "maria", {
      eligibleOnly: true,
    })
    await expect(response.json()).resolves.toEqual({
      ok: true,
      results: [{ id: PROFILE_ID }],
    })
  })

  it("adds the people chosen and answers with what happened to each", async () => {
    addParticipantsDirectly.mockResolvedValue([
      { profileId: PROFILE_ID, outcome: "added" },
    ])

    const response = await post({
      intent: "add",
      eventId: EVENT_ID,
      people: [{ profileId: PROFILE_ID, spotType: "staff" }],
    })

    expect(addParticipantsDirectly).toHaveBeenCalledWith({
      eventId: EVENT_ID,
      people: [{ profileId: PROFILE_ID, spotType: "staff" }],
    })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      outcomes: [{ profileId: PROFILE_ID, outcome: "added" }],
    })
  })

  it("says why an event in draft or cancelled refuses additions", async () => {
    addParticipantsDirectly.mockRejectedValue(
      new EventNotAcceptingAdditionsError(),
    )

    const response = await post({
      intent: "add",
      eventId: EVENT_ID,
      people: [{ profileId: PROFILE_ID, spotType: "regular" }],
    })

    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: new EventNotAcceptingAdditionsError().message,
    })
  })

  it("refuses more than 100 people in one request", async () => {
    const response = await post({
      intent: "add",
      eventId: EVENT_ID,
      people: Array.from({ length: 101 }, () => ({
        profileId: PROFILE_ID,
        spotType: "regular",
      })),
    })

    expect(response.status).toBe(422)
    expect(addParticipantsDirectly).not.toHaveBeenCalled()
  })

  it("refuses a body it cannot read", async () => {
    const response = await call("not json")

    expect(response.status).toBe(400)
  })

  it.each([
    { intent: "nonsense", eventId: EVENT_ID },
    { intent: "search", eventId: "eventos", term: "maria" },
    { intent: "add", eventId: "eventos", people: [{ profileId: PROFILE_ID, spotType: "regular" }] },
    { intent: "add", eventId: EVENT_ID, people: [{ profileId: "perfil", spotType: "regular" }] },
    { intent: "add", eventId: EVENT_ID, people: [{ profileId: PROFILE_ID, spotType: "vip" }] },
    { intent: "add", eventId: EVENT_ID, people: [] },
    {
      intent: "add",
      eventId: EVENT_ID,
      people: [
        { profileId: PROFILE_ID, spotType: "regular" },
        { profileId: PROFILE_ID, spotType: "staff" },
      ],
    },
    { intent: "search", eventId: EVENT_ID, term: "a".repeat(101) },
  ])("refuses a malformed body before anything reaches the database: %o", async (body) => {
    const response = await post(body)

    expect(response.status).toBe(422)
    expect(searchProfilesForInvite).not.toHaveBeenCalled()
    expect(addParticipantsDirectly).not.toHaveBeenCalled()
  })
})
