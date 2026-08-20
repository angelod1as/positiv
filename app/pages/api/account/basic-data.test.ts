import type { ActionFunctionArgs } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { action } from "./basic-data"

const save = vi.hoisted(() => vi.fn())
const getUserContext = vi.hoisted(() => vi.fn())

vi.mock("~/business/participant/basic-data.server", () => ({
  saveBasicData: save,
}))

vi.mock("~/business/auth/auth.server", () => ({
  getUserContext,
}))

const context = { currentUser: { id: "user-1", email: "a@b.com" } }

const post = (body: string) =>
  action({
    request: new Request("http://localhost/api/account/dados-basicos", {
      method: "POST",
      body,
    }),
    params: {},
    context: {},
  } as unknown as ActionFunctionArgs)

describe("basic data commit endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("hands the answers to the save and answers with its verdict", async () => {
    getUserContext.mockResolvedValue(context)
    save.mockResolvedValue({ ok: true })

    const response = await post(JSON.stringify({ full_name: "Ana" }))

    expect(await response.json()).toEqual({ ok: true })
    expect(save).toHaveBeenCalledWith({
      answers: { full_name: "Ana" },
      context,
    })
  })

  it("passes a refusal through with the question it belongs to", async () => {
    getUserContext.mockResolvedValue(context)
    save.mockResolvedValue({
      ok: false,
      errors: [{ questionId: "cpf", message: "Campo obrigatório" }],
    })

    const response = await post(JSON.stringify({}))

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      ok: false,
      errors: [{ questionId: "cpf", message: "Campo obrigatório" }],
    })
  })

  it("blames no question for a body it cannot read", async () => {
    getUserContext.mockResolvedValue(context)

    const response = await post("nao é json")

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ ok: false, errors: [] })
    expect(save).not.toHaveBeenCalled()
  })
})
