import { InputError } from "composable-functions"
import type { ActionFunctionArgs } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { action } from "./event-participant"

const updateEventParticipantById = vi.hoisted(() => vi.fn())
const getAdminContext = vi.hoisted(() => vi.fn())

vi.mock("~/business/admin/admin.server", () => ({
  updateEventParticipantById,
  getAdminContext,
}))

const context = { currentProfile: { id: "profile-1", is_admin: true } }

const post = (body: string) =>
  action({
    request: new Request("http://localhost/api/admin/event-participant", {
      method: "POST",
      body,
    }),
    params: {},
    context: {},
  } as unknown as ActionFunctionArgs)

describe("event participant commit endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAdminContext.mockResolvedValue(context)
  })

  it("writes the edited cell against the participant the body names", async () => {
    updateEventParticipantById.mockResolvedValue({
      success: true,
      data: null,
      errors: [],
    })

    const response = await post(
      JSON.stringify({
        id: "participant-1",
        profile_id: "profile-2",
        has_paid: true,
      }),
    )

    expect(await response.json()).toEqual({ ok: true })
    expect(updateEventParticipantById).toHaveBeenCalledWith({
      id: "participant-1",
      profile_id: "profile-2",
      has_paid: true,
    })
  })

  it("gives a refused field back to the question that asked it", async () => {
    updateEventParticipantById.mockResolvedValue({
      success: false,
      errors: [new InputError("Escreva o motivo da flag", ["flag_notes"])],
    })

    const response = await post(
      JSON.stringify({ id: "participant-1", profile_id: "profile-2", flag: "yellow" }),
    )

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      ok: false,
      errors: [{ questionId: "flag_notes", message: "Escreva o motivo da flag" }],
    })
  })

  it("blames no question for a body it cannot read", async () => {
    const response = await post("não é json")

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ ok: false, errors: [] })
    expect(updateEventParticipantById).not.toHaveBeenCalled()
  })

  it("asks who is saving before it saves anything", async () => {
    getAdminContext.mockRejectedValue(new Response(null, { status: 302 }))

    await expect(
      post(JSON.stringify({ id: "participant-1", profile_id: "profile-2" })),
    ).rejects.toBeInstanceOf(Response)
    expect(updateEventParticipantById).not.toHaveBeenCalled()
  })
})
