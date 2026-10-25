import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  getAdminContext,
  updateProfileAdminNotes,
} from "~/business/admin/admin.server"
import { syncVeteransListmonkList } from "~/business/newsletter/veterans-list.server"
import { adminParticipantsCopy } from "~/copy/admin/participants"
import { action } from "./participants-page"

vi.mock("~/business/admin/admin.server", () => ({
  getAdminContext: vi.fn(),
  getAllProfiles: vi.fn(),
  updateProfileAdminNotes: vi.fn(),
}))

vi.mock("~/business/newsletter/veterans-list.server", () => ({
  syncVeteransListmonkList: vi.fn(),
}))

const buildRequest = (fields: Record<string, string>) =>
  new Request("http://localhost/admin/perfis", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  })

const runAction = (fields: Record<string, string>) =>
  action({ request: buildRequest(fields), params: {} } as Parameters<
    typeof action
  >[0])

const fields = {
  intent: "update-profile-admin-notes",
  profile_id: "profile-1",
  admin_notes: "a note",
}

describe("ParticipantsPage action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAdminContext).mockResolvedValue(
      {} as Awaited<ReturnType<typeof getAdminContext>>,
    )
    vi.mocked(updateProfileAdminNotes).mockResolvedValue({
      success: true,
    } as never)
  })

  it("should refuse to run for a non-admin", async () => {
    vi.mocked(getAdminContext).mockRejectedValue(
      new Response(null, { status: 302 }),
    )

    await expect(runAction(fields)).rejects.toBeInstanceOf(Response)

    expect(updateProfileAdminNotes).not.toHaveBeenCalled()
  })

  it("should run for an admin", async () => {
    await runAction(fields)

    expect(getAdminContext).toHaveBeenCalledTimes(1)
    expect(updateProfileAdminNotes).toHaveBeenCalledTimes(1)
  })
})

describe("ParticipantsPage action - sync veterans list", () => {
  const syncFields = { intent: "sync-veterans-list" }

  const givenAdminWith = (permissions: string[]) =>
    vi.mocked(getAdminContext).mockResolvedValue({
      currentProfile: { permissions },
    } as unknown as Awaited<ReturnType<typeof getAdminContext>>)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should refuse an admin without the newsletter permission", async () => {
    givenAdminWith(["admin.panel"])

    const result = await runAction(syncFields)

    expect(result).toEqual({
      intent: "sync-veterans-list",
      error: adminParticipantsCopy.veteransSync.forbidden,
    })
    expect(syncVeteransListmonkList).not.toHaveBeenCalled()
  })

  it("should return the sync counts to an admin with the newsletter permission", async () => {
    givenAdminWith(["admin.panel", "newsletter.manage"])
    vi.mocked(syncVeteransListmonkList).mockResolvedValue({
      success: true,
      data: { added: 3, removed: 1, total: 12 },
      errors: [],
    })

    const result = await runAction(syncFields)

    expect(syncVeteransListmonkList).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      intent: "sync-veterans-list",
      result: { added: 3, removed: 1, total: 12 },
    })
  })

  it("should return an error when the sync fails", async () => {
    givenAdminWith(["admin.panel", "newsletter.manage"])
    vi.mocked(syncVeteransListmonkList).mockResolvedValue({
      success: false,
      errors: [new Error("Listmonk is down")],
    })

    const result = await runAction(syncFields)

    expect(result).toEqual({
      intent: "sync-veterans-list",
      error: adminParticipantsCopy.veteransSync.failed,
    })
  })
})
