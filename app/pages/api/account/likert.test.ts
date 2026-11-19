import type { ActionFunctionArgs } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { action } from "./likert"

const submit = vi.hoisted(() => vi.fn())
const getUserContext = vi.hoisted(() => vi.fn())

vi.mock("~/business/profile/likert-answers.server", () => ({
  submitLikertAnswers: submit,
}))

vi.mock("~/business/auth/auth.server", () => ({
  getUserContext,
}))

const currentProfile = { id: "profile-1", permissions: [] }

const post = (body: string) =>
  action({
    request: new Request("http://localhost/api/account/escala", {
      method: "POST",
      body,
    }),
    params: {},
    context: {},
  } as unknown as ActionFunctionArgs)

describe("Likert commit endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUserContext.mockResolvedValue({ currentProfile })
  })

  it("saves the answers for the person signed in", async () => {
    submit.mockResolvedValue({ ok: true })

    const response = await post(JSON.stringify({ ciume: { choice: "agree" } }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(submit).toHaveBeenCalledWith({
      answers: { ciume: { choice: "agree" } },
      viewer: currentProfile,
    })
  })

  it("passes a refusal through as 422", async () => {
    submit.mockResolvedValue({ ok: false, errors: [], message: "mudou" })

    const response = await post(JSON.stringify({}))

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      ok: false,
      errors: [],
      message: "mudou",
    })
  })

  it("answers a body it cannot read with 400, saving nothing", async () => {
    const response = await post("not json")

    expect(response.status).toBe(400)
    expect(submit).not.toHaveBeenCalled()
  })

  it.each(["null", "[]", '"texto"', "3"])(
    "answers %s, which is not a set of answers, with 400",
    async (body) => {
      const response = await post(body)

      expect(response.status).toBe(400)
      expect(submit).not.toHaveBeenCalled()
    },
  )

  it("leaves someone signed out to the sign-in redirect", async () => {
    getUserContext.mockRejectedValue(new Response(null, { status: 302 }))

    await expect(post("{}")).rejects.toBeInstanceOf(Response)
    expect(submit).not.toHaveBeenCalled()
  })
})
