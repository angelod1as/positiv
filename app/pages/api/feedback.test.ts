import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ENV } from "varlock/env"
import { logger } from "~/lib/logger/logger.server"
import { action } from "./feedback"

vi.mock("varlock/env", () => ({ ENV: { APP_ENV: "development" } }))

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const runningIn = (env: string) => {
  ;(ENV as { APP_ENV: string }).APP_ENV = env
}

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

  it("passes on the address the proxy saw", async () => {
    await run(answers, { "x-real-ip": "10.0.0.7" })

    expect(mockSubmitFeedbackForm).toHaveBeenCalledWith({
      answers,
      ip: "10.0.0.7",
    })
  })

  it("passes on the address the proxy appended, not the one the client claimed", async () => {
    await run(answers, { "x-forwarded-for": "198.51.100.1, 10.0.0.8" })

    expect(mockSubmitFeedbackForm).toHaveBeenCalledWith({
      answers,
      ip: "10.0.0.8",
    })
  })

  describe("without an address", () => {
    afterEach(() => runningIn("development"))

    it("logs it in production, where the proxy always sets one", async () => {
      runningIn("production")

      await run(answers)

      expect(logger.error).toHaveBeenCalled()
    })

    it("stays quiet outside production, where no proxy runs", async () => {
      await run(answers)

      expect(logger.error).not.toHaveBeenCalled()
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
