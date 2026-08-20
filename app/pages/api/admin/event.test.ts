import { InputError } from "composable-functions"
import type { ActionFunctionArgs } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { action } from "./event"

const createOrUpdateEvent = vi.hoisted(() => vi.fn())
const getAdminContext = vi.hoisted(() => vi.fn())

vi.mock("~/business/admin/admin.server", () => ({
  createOrUpdateEvent,
  getAdminContext,
}))

const context = { currentProfile: { id: "profile-1", is_admin: true } }

const answers = {
  title: "Rapa do Tacho",
  emoji: "🎉",
  description: "Para quem sobreviveu ao carnaval",
  location: "Motel Harmony",
  ticket_price: "200",
  total_spots: "60",
  auto_publish: true,
  time_event_start: "2026-02-01T10:00",
}

const post = (body: string) =>
  action({
    request: new Request("http://localhost/api/admin/event", {
      method: "POST",
      body,
    }),
    params: {},
    context: {},
  } as unknown as ActionFunctionArgs)

describe("event commit endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAdminContext.mockResolvedValue(context)
  })

  it("saves the event and says which one it is now", async () => {
    createOrUpdateEvent.mockResolvedValue({
      success: true,
      data: "event-1",
      errors: [],
    })

    const response = await post(JSON.stringify(answers))

    expect(await response.json()).toEqual({ ok: true, id: "event-1" })
    expect(createOrUpdateEvent).toHaveBeenCalledWith(answers, {
      ...context,
      eventId: undefined,
    })
  })

  it("updates the event the answers name", async () => {
    createOrUpdateEvent.mockResolvedValue({
      success: true,
      data: "event-1",
      errors: [],
    })

    await post(JSON.stringify({ ...answers, id: "event-1" }))

    expect(createOrUpdateEvent).toHaveBeenCalledWith(
      { ...answers, id: "event-1" },
      { ...context, eventId: "event-1" },
    )
  })

  it("gives a refused field back to the question that asked it", async () => {
    createOrUpdateEvent.mockResolvedValue({
      success: false,
      errors: [new InputError("Precisa ser um emoji", ["emoji"])],
    })

    const response = await post(JSON.stringify({ ...answers, emoji: "festa" }))

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      ok: false,
      errors: [{ questionId: "emoji", message: "Precisa ser um emoji" }],
    })
  })

  it("speaks for a save nothing in the form is to blame for", async () => {
    createOrUpdateEvent.mockResolvedValue({
      success: false,
      errors: [new Error("Erro ao salvar")],
    })

    const response = await post(JSON.stringify(answers))

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      ok: false,
      errors: [],
      message: "Erro ao salvar",
    })
  })

  it("blames no question for a body it cannot read", async () => {
    const response = await post("não é json")

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ ok: false, errors: [] })
    expect(createOrUpdateEvent).not.toHaveBeenCalled()
  })

  it("asks who is saving before it saves anything", async () => {
    getAdminContext.mockRejectedValue(new Response(null, { status: 302 }))

    await expect(post(JSON.stringify(answers))).rejects.toBeInstanceOf(Response)
    expect(createOrUpdateEvent).not.toHaveBeenCalled()
  })
})
