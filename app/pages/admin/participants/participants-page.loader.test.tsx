import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  getAdminContext,
  getAllProfiles,
} from "~/business/admin/admin.server"
import { loader } from "./participants-page"

vi.mock("~/business/admin/admin.server", () => ({
  getAdminContext: vi.fn(),
  getAllProfiles: vi.fn(),
  updateProfileAdminNotes: vi.fn(),
}))

vi.mock("~/business/newsletter/veterans-list.server", () => ({
  syncVeteransListmonkList: vi.fn(),
}))

const runLoader = () =>
  loader({
    request: new Request("http://localhost/admin/perfis"),
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
})
