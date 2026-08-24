import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  getAdminContext,
  updateProfileAdminNotes,
} from "~/business/admin/admin.server"
import { action } from "./participants-page"

vi.mock("~/business/admin/admin.server", () => ({
  getAdminContext: vi.fn(),
  getAllProfiles: vi.fn(),
  updateProfileAdminNotes: vi.fn(),
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
