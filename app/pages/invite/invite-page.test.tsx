import { beforeEach, describe, expect, it, vi } from "vitest"

const getContext = vi.fn()
vi.mock("~/business/auth/auth.server", () => ({
  getContext: (...args: unknown[]) => getContext(...args),
}))

const findValidInviteByToken = vi.fn()
vi.mock("~/business/participant/event-invite.server", () => ({
  findValidInviteByToken: (...args: unknown[]) =>
    findValidInviteByToken(...args),
}))

import { loader } from "./invite-page"

type LoaderArgs = Parameters<typeof loader>[0]

const call = (token: string) =>
  loader({
    request: new Request(`http://localhost:5173/convite/${token}`),
    params: { token },
  } as unknown as LoaderArgs)

describe("the invite landing page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getContext.mockResolvedValue({ currentProfile: { id: "p1" } })
    findValidInviteByToken.mockResolvedValue({
      event_id: "e1",
      profile_id: "p1",
    })
  })

  it("sends the invited person to the event's rules", async () => {
    const result = await call("tok")

    expect(result).toBeInstanceOf(Response)
    expect((result as Response).headers.get("Location")).toBe(
      "/dashboard/e1/regras",
    )
  })

  it("sends a signed-out visitor to the login, naming this page", async () => {
    getContext.mockResolvedValue({ currentProfile: null })

    const result = await call("tok")

    expect((result as Response).headers.get("Location")).toBe(
      "/entrar?redirect_to=%2Fconvite%2Ftok",
    )
  })

  it("does not go looking for the invite before there is somebody to match it against", async () => {
    getContext.mockResolvedValue({ currentProfile: null })

    await call("tok")

    expect(findValidInviteByToken).not.toHaveBeenCalled()
  })

  it("tells someone else's visitor that the invite is not theirs", async () => {
    getContext.mockResolvedValue({ currentProfile: { id: "someone-else" } })

    const result = await call("tok")

    expect(result).toMatchObject({ outcome: "wrong-person" })
  })

  it("reports an unknown token as invalid", async () => {
    findValidInviteByToken.mockResolvedValue(undefined)

    const result = await call("tok")

    expect(result).toMatchObject({ outcome: "invalid" })
  })
})
