import { InputError } from "composable-functions"
import type { ActionFunctionArgs } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { action } from "./event-status"

const updateEventStatus = vi.hoisted(() => vi.fn())
const getAdminContext = vi.hoisted(() => vi.fn())

vi.mock("~/business/admin/admin.server", () => ({
  updateEventStatus,
  getAdminContext,
}))

const context = {
  currentProfile: { id: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f" },
}

const post = (body: string, id = "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c") =>
  action({
    request: new Request(`http://localhost/api/admin/event-status/${id}`, {
      method: "POST",
      body,
    }),
    params: { id },
    context: {},
  } as unknown as ActionFunctionArgs)

describe("event status commit endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAdminContext.mockResolvedValue(context)
  })

  it("writes the status against the event in the url", async () => {
    updateEventStatus.mockResolvedValue({
      success: true,
      data: null,
      errors: [],
    })

    const response = await post(JSON.stringify({ event_status: "Completed" }))

    expect(await response.json()).toEqual({ ok: true })
    expect(updateEventStatus).toHaveBeenCalledWith(
      { event_status: "Completed" },
      { ...context, eventId: "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c" },
    )
  })

  it("gives a refused status back to the question that asked it", async () => {
    updateEventStatus.mockResolvedValue({
      success: false,
      errors: [new InputError("Valor inválido", ["event_status"])],
    })

    const response = await post(JSON.stringify({ event_status: "Bananas" }))

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      ok: false,
      errors: [{ questionId: "event_status", message: "Valor inválido" }],
    })
  })

  it("blames no question for a body it cannot read", async () => {
    const response = await post("não é json")

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ ok: false, errors: [] })
    expect(updateEventStatus).not.toHaveBeenCalled()
  })

  it("refuses to write a status against no event at all", async () => {
    const response = await action({
      request: new Request("http://localhost/api/admin/event-status/", {
        method: "POST",
        body: JSON.stringify({ event_status: "Completed" }),
      }),
      params: {},
      context: {},
    } as unknown as ActionFunctionArgs)

    expect(response.status).toBe(400)
    expect(updateEventStatus).not.toHaveBeenCalled()
  })

  it("asks who is saving before it saves anything", async () => {
    getAdminContext.mockRejectedValue(new Response(null, { status: 302 }))

    await expect(
      post(JSON.stringify({ event_status: "Completed" })),
    ).rejects.toBeInstanceOf(Response)
    expect(updateEventStatus).not.toHaveBeenCalled()
  })
})
