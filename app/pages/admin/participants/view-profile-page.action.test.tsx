import { beforeEach, describe, expect, it, vi } from "vitest"
import { setProfileCpfExempt } from "~/business/profile/cpf-exemption.server"
import { getAdminContext } from "~/business/auth/admin-context.server"
import { updateProfileAdminNotes, updateProfileApprovalStatus } from "~/business/profile/profiles.server"
import { action } from "./view-profile-page"

vi.mock("~/business/profile/cpf-exemption.server", () => ({
  setProfileCpfExempt: vi.fn(),
}))

vi.mock("~/business/auth/admin-context.server", () => ({
  getAdminContext: vi.fn(),
}))
vi.mock("~/business/profile/profiles.server", () => ({
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
  {
    intent: "update-profile-cpf-exempt",
    fields: {
      profileId: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
      cpfExempt: "true",
    },
    mutation: setProfileCpfExempt,
  },
] as const

describe("ViewProfilePage action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(setProfileCpfExempt).mockResolvedValue({
      success: true,
    } as never)
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

describe("ViewProfilePage action - non-form body", () => {
  it("answers a JSON body with 415", async () => {
    vi.mocked(getAdminContext).mockResolvedValue(
      {} as Awaited<ReturnType<typeof getAdminContext>>,
    )

    const thrown = await action({
      request: new Request("http://localhost/admin/perfis/7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
      params: { profileId: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f" },
    } as Parameters<typeof action>[0]).catch((error: unknown) => error)

    expect(thrown).toBeInstanceOf(Response)
    expect((thrown as Response).status).toBe(415)
  })
})

describe("ViewProfilePage action - CPF exemption", () => {
  it("exempts the profile of the page, whatever the form names", async () => {
    vi.mocked(getAdminContext).mockResolvedValue(
      {} as Awaited<ReturnType<typeof getAdminContext>>,
    )
    vi.mocked(setProfileCpfExempt).mockResolvedValue({ success: true } as never)

    await runAction({
      intent: "update-profile-cpf-exempt",
      profileId: "00000000-0000-4000-8000-000000000000",
      cpfExempt: "true",
    })

    expect(setProfileCpfExempt).toHaveBeenCalledWith({
      profileId: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
      cpfExempt: "true",
    })
  })

  it("hands the refusal back to the admin", async () => {
    vi.mocked(getAdminContext).mockResolvedValue(
      {} as Awaited<ReturnType<typeof getAdminContext>>,
    )
    vi.mocked(setProfileCpfExempt).mockResolvedValue({
      success: false,
      errors: [new Error("Cancele a cobrança antes")],
    } as never)

    const result = await runAction({
      intent: "update-profile-cpf-exempt",
      profileId: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
      cpfExempt: "true",
    })

    expect(result).toEqual({
      success: false,
      errors: [{ message: "Cancele a cobrança antes" }],
    })
  })
})
