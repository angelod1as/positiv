import type { ActionFunctionArgs } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { action } from "./event-demographics"

const updateEventDemographics = vi.hoisted(() => vi.fn())
const getAdminContext = vi.hoisted(() => vi.fn())

vi.mock("~/business/admin/admin.server", () => ({
  updateEventDemographics,
  getAdminContext,
}))

const context = { currentProfile: { id: "profile-1", is_admin: true } }

const post = (body: string, id = "event-1") =>
  action({
    request: new Request(`http://localhost/api/admin/event-demographics/${id}`, {
      method: "POST",
      body,
    }),
    params: { id },
    context: {},
  } as unknown as ActionFunctionArgs)

describe("event demographics commit endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAdminContext.mockResolvedValue(context)
  })

  it("counts the event in the url again", async () => {
    updateEventDemographics.mockResolvedValue({
      success: true,
      data: null,
      errors: [],
    })

    const response = await post(JSON.stringify({}))

    expect(await response.json()).toEqual({ ok: true })
    expect(updateEventDemographics).toHaveBeenCalledWith(
      {},
      { ...context, eventId: "event-1" },
    )
  })

  it("says the count failed in the words the failure came with", async () => {
    updateEventDemographics.mockResolvedValue({
      success: false,
      errors: [
        new Error("Demographics can only be updated for completed events"),
      ],
    })

    const response = await post(JSON.stringify({}))

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      ok: false,
      errors: [],
      message: "Demographics can only be updated for completed events",
    })
  })

  it("blames no question for a body it cannot read", async () => {
    const response = await post("não é json")

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ ok: false, errors: [] })
    expect(updateEventDemographics).not.toHaveBeenCalled()
  })

  it("refuses to count demographics for no event at all", async () => {
    const response = await action({
      request: new Request("http://localhost/api/admin/event-demographics/", {
        method: "POST",
        body: JSON.stringify({}),
      }),
      params: {},
      context: {},
    } as unknown as ActionFunctionArgs)

    expect(response.status).toBe(400)
    expect(updateEventDemographics).not.toHaveBeenCalled()
  })

  it("asks who is saving before it saves anything", async () => {
    getAdminContext.mockRejectedValue(new Response(null, { status: 302 }))

    await expect(post(JSON.stringify({}))).rejects.toBeInstanceOf(Response)
    expect(updateEventDemographics).not.toHaveBeenCalled()
  })
})
