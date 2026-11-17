import { beforeEach, describe, expect, it, vi } from "vitest"
import { getAdminContext } from "~/business/auth/admin-context.server"
import {
  findProfileIdForAdminLookup,
  getAllProfiles,
} from "~/business/profile/profiles.server"
import paths from "~/lib/paths"
import { loader } from "./participants-page"

vi.mock("~/business/auth/admin-context.server", () => ({
  getAdminContext: vi.fn(),
}))
vi.mock("~/business/profile/profiles.server", () => ({
  findProfileIdForAdminLookup: vi.fn(),
  getAllProfiles: vi.fn(),
  updateProfileAdminNotes: vi.fn(),
}))

vi.mock("~/business/newsletter/veterans-list.server", () => ({
  syncVeteransListmonkList: vi.fn(),
}))

const runLoader = (url = "http://localhost/admin/perfis") =>
  loader({
    request: new Request(url),
    params: {},
  } as Parameters<typeof loader>[0])

const givenAdminWith = (permissions: string[]) =>
  vi.mocked(getAdminContext).mockResolvedValue({
    currentProfile: { permissions },
  } as unknown as Awaited<ReturnType<typeof getAdminContext>>)

describe("ParticipantsPage loader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAllProfiles).mockResolvedValue({
      success: true,
      data: [],
      errors: [],
    } as never)
  })

  it("should tell the page an admin with the newsletter permission can sync", async () => {
    givenAdminWith(["admin.panel", "newsletter.manage"])

    expect(await runLoader()).toMatchObject({ canManageNewsletter: true })
  })

  it("should tell the page an admin without the newsletter permission cannot sync", async () => {
    givenAdminWith(["admin.panel"])

    expect(await runLoader()).toMatchObject({ canManageNewsletter: false })
  })

  describe("when the search asks to open a profile", () => {
    const profileId = "11111111-1111-4111-8111-111111111111"
    const lookupUrl = (query: string) =>
      `http://localhost/admin/participantes?perfil=${encodeURIComponent(query)}`

    beforeEach(() => givenAdminWith(["admin.panel"]))

    it("should redirect to the profile the lookup finds", async () => {
      vi.mocked(findProfileIdForAdminLookup).mockResolvedValue({
        success: true,
        data: profileId,
        errors: [],
      } as never)

      const response = await runLoader(lookupUrl("pessoa@example.com"))

      expect(findProfileIdForAdminLookup).toHaveBeenCalledWith({
        query: "pessoa@example.com",
      })
      expect(response).toBeInstanceOf(Response)
      expect((response as Response).headers.get("Location")).toBe(
        paths.admin.ADMIN_VIEW_PARTICIPANT(profileId),
      )
      expect(getAllProfiles).not.toHaveBeenCalled()
    })

    it("should go back to the list with an error when no profile matches", async () => {
      vi.mocked(findProfileIdForAdminLookup).mockResolvedValue({
        success: true,
        data: null,
        errors: [],
      } as never)

      const response = await runLoader(lookupUrl("ninguem"))

      expect(response).toBeInstanceOf(Response)
      expect((response as Response).headers.get("Location")).toBe(
        paths.admin.ADMIN_PARTICIPANTS,
      )
      expect((response as Response).headers.get("Set-Cookie")).toBeTruthy()
    })
  })
})
