import { beforeEach, describe, expect, it, vi } from "vitest"
import { action } from "./feedback"

vi.mock("~/business/feedback/submit-feedback-form.server", () => ({
  submitFeedbackForm: vi.fn(),
}))

import { submitFeedbackForm } from "~/business/feedback/submit-feedback-form.server"

const mockSubmitFeedbackForm = vi.mocked(submitFeedbackForm)

const answers = {
  hasParticipated: "once",
  feedbackText: "Um feedback de tamanho decente",
  captchaToken: "token",
}

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })

const run = (body: unknown, headers?: Record<string, string>) =>
  action({ request: post(body, headers), params: {}, context: {} as never })

describe("feedback commit route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSubmitFeedbackForm.mockResolvedValue({ ok: true })
  })

  it("hands the answers over and answers with what came back", async () => {
    const response = await run(answers)

    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(mockSubmitFeedbackForm).toHaveBeenCalledWith({
      answers,
      ip: "unknown",
    })
  })

  it("passes on the address the edge saw", async () => {
    await run(answers, { "cf-connecting-ip": "10.0.0.7" })

    expect(mockSubmitFeedbackForm).toHaveBeenCalledWith({
      answers,
      ip: "10.0.0.7",
    })
  })

  it("refuses a body it cannot read", async () => {
    const response = await run("not json")

    expect(response.status).toBe(400)
    expect(mockSubmitFeedbackForm).not.toHaveBeenCalled()
  })

  it("does not let a refused feedback read as a success", async () => {
    mockSubmitFeedbackForm.mockResolvedValue({
      ok: false,
      errors: [],
      message: "Você já enviou um feedback recentemente.",
    })

    const response = await run(answers)

    expect(response.status).toBe(422)
  })
})
