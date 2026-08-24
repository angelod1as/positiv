import { InputError } from "composable-functions"
import type { ActionFunctionArgs } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { action } from "./feedback-status"

const updateFeedbackStatus = vi.hoisted(() => vi.fn())
const getAdminContext = vi.hoisted(() => vi.fn())

vi.mock("~/business/feedback/feedback.server", () => ({ updateFeedbackStatus }))
vi.mock("~/business/admin/admin.server", () => ({ getAdminContext }))

const context = { currentProfile: { id: "profile-1", is_admin: true } }

const post = (body: string) =>
  action({
    request: new Request("http://localhost/api/admin/feedback-status", {
      method: "POST",
      body,
    }),
    params: {},
    context: {},
  } as unknown as ActionFunctionArgs)

describe("feedback status commit endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAdminContext.mockResolvedValue(context)
  })

  it("writes the status against the feedback the body names", async () => {
    updateFeedbackStatus.mockResolvedValue({
      success: true,
      data: null,
      errors: [],
    })

    const response = await post(
      JSON.stringify({ id: "feedback-1", status: "resolved" }),
    )

    expect(await response.json()).toEqual({ ok: true })
    expect(updateFeedbackStatus).toHaveBeenCalledWith({
      id: "feedback-1",
      status: "resolved",
    })
  })

  it("gives a refused status back to the question that asked it", async () => {
    updateFeedbackStatus.mockResolvedValue({
      success: false,
      errors: [new InputError("Status inválido", ["status"])],
    })

    const response = await post(
      JSON.stringify({ id: "feedback-1", status: "bananas" }),
    )

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      ok: false,
      errors: [{ questionId: "status", message: "Status inválido" }],
    })
  })

  it("blames no question for a body it cannot read", async () => {
    const response = await post("não é json")

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ ok: false, errors: [] })
    expect(updateFeedbackStatus).not.toHaveBeenCalled()
  })

  it("asks who is saving before it saves anything", async () => {
    getAdminContext.mockRejectedValue(new Response(null, { status: 302 }))

    await expect(
      post(JSON.stringify({ id: "feedback-1", status: "resolved" })),
    ).rejects.toBeInstanceOf(Response)
    expect(updateFeedbackStatus).not.toHaveBeenCalled()
  })
})
