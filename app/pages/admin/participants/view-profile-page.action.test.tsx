import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  getAdminContext,
  updateProfileAdminNotes,
  updateProfileApprovalStatus,
} from "~/business/admin/admin.server"
import { action } from "./view-profile-page"

vi.mock("~/business/admin/admin.server", () => ({
  getAdminContext: vi.fn(),
  getParticipantFullEventHistory: vi.fn(),
  getProfileById: vi.fn(),
  updateProfileAdminNotes: vi.fn(),
  updateProfileApprovalStatus: vi.fn(),
}))

const buildRequest = (fields: Record<string, string>) =>
  new Request(
    "http://localhost/admin/perfis/7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields).toString(),
    },
  )

const runAction = (fields: Record<string, string>) =>
  action({
    request: buildRequest(fields),
    params: { profileId: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f" },
  } as Parameters<typeof action>[0])

const INTENTS = [
  {
    intent: "update-profile-approval-status",
    fields: {
      profile_id: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
      approved_to_attend: "approved",
    },
    mutation: updateProfileApprovalStatus,
  },
  {
    intent: "update-profile-admin-notes",
    fields: {
      profile_id: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
      admin_notes: "a note",
    },
    mutation: updateProfileAdminNotes,
  },
] as const

describe("ViewProfilePage action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAdminContext).mockResolvedValue(
      {} as Awaited<ReturnType<typeof getAdminContext>>,
    )
    vi.mocked(updateProfileApprovalStatus).mockResolvedValue({
      success: true,
    } as never)
    vi.mocked(updateProfileAdminNotes).mockResolvedValue({
      success: true,
    } as never)
  })

  describe.each(INTENTS)("$intent", ({ intent, fields, mutation }) => {
    it("should refuse to run for a non-admin", async () => {
      vi.mocked(getAdminContext).mockRejectedValue(
        new Response(null, { status: 302 }),
      )

      await expect(runAction({ intent, ...fields })).rejects.toBeInstanceOf(
        Response,
      )

      expect(mutation).not.toHaveBeenCalled()
    })

    it("should run for an admin", async () => {
      await runAction({ intent, ...fields })

      expect(getAdminContext).toHaveBeenCalledTimes(1)
      expect(mutation).toHaveBeenCalledTimes(1)
    })
  })
})
