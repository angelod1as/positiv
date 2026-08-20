import { beforeEach, describe, expect, it, vi } from "vitest"
import { publicCopy } from "~/copy/public"
import { submitFeedbackForm } from "./submit-feedback-form.server"

vi.mock("varlock/env", () => ({
  ENV: { APP_ENV: "production" },
}))

vi.mock("./feedback-rate-limiter", () => ({
  feedbackRateLimiter: {
    isRateLimited: vi.fn(() => false),
    recordRequest: vi.fn(),
  },
}))

vi.mock("./feedback.server", () => ({
  submitFeedback: vi.fn(async () => ({ id: "feedback-1" })),
}))

vi.mock("./notify-new-feedback.server", () => ({
  notifyNewFeedback: vi.fn(async () => undefined),
}))

vi.mock("~/lib/helpers/verify-turnstile.server", () => ({
  verifyTurnstileToken: vi.fn(async () => ({ success: true })),
}))

vi.mock("~/lib/logger/logger.server", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

import { feedbackRateLimiter } from "./feedback-rate-limiter"
import { submitFeedback } from "./feedback.server"
import { notifyNewFeedback } from "./notify-new-feedback.server"
import { verifyTurnstileToken } from "~/lib/helpers/verify-turnstile.server"

const feedbackCopy = publicCopy.feedback

const answers = {
  name: "Angela",
  email: "pessoa@exemplo.com",
  whatsapp: "11999999999",
  hasParticipated: "once",
  feedbackText: "Um feedback de tamanho decente",
  canContact: true,
  captchaToken: "token",
}

describe("submitFeedbackForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(feedbackRateLimiter.isRateLimited).mockReturnValue(false)
    vi.mocked(verifyTurnstileToken).mockResolvedValue({ success: true })
    vi.mocked(submitFeedback).mockResolvedValue({ id: "feedback-1" } as never)
  })

  it("stores the feedback without the captcha token", async () => {
    const result = await submitFeedbackForm({ answers, ip: "10.0.0.1" })

    expect(result).toEqual({ ok: true })
    const [stored] = vi.mocked(submitFeedback).mock.calls[0]
    expect(stored).not.toHaveProperty("captchaToken")
    expect(stored).toMatchObject({ name: "Angela", canContact: true })
  })

  it("says who to write to about it", async () => {
    await submitFeedbackForm({ answers, ip: "10.0.0.1" })

    expect(notifyNewFeedback).toHaveBeenCalled()
  })

  it("still confirms the feedback when the notification fails", async () => {
    vi.mocked(notifyNewFeedback).mockRejectedValue(new Error("smtp down"))

    const result = await submitFeedbackForm({ answers, ip: "10.0.0.1" })

    expect(result).toEqual({ ok: true })
  })

  it("counts the request against the address that sent it", async () => {
    await submitFeedbackForm({ answers, ip: "10.0.0.1" })

    expect(feedbackRateLimiter.recordRequest).toHaveBeenCalledWith("10.0.0.1")
  })

  it("refuses a second feedback from an address that just sent one", async () => {
    vi.mocked(feedbackRateLimiter.isRateLimited).mockReturnValue(true)

    const result = await submitFeedbackForm({ answers, ip: "10.0.0.1" })

    expect(result).toEqual({
      ok: false,
      errors: [],
      message: feedbackCopy.rateLimited,
    })
    expect(submitFeedback).not.toHaveBeenCalled()
  })

  it("blames the captcha when the security check refuses it", async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue({
      success: false,
    } as never)

    const result = await submitFeedbackForm({ answers, ip: "10.0.0.1" })

    expect(result).toEqual({
      ok: false,
      errors: [
        { questionId: "captchaToken", message: feedbackCopy.captchaFailed },
      ],
    })
    expect(submitFeedback).not.toHaveBeenCalled()
  })

  it("refuses answers the schema rejects, naming the fields", async () => {
    const result = await submitFeedbackForm({
      answers: { ...answers, feedbackText: "curto" },
      ip: "10.0.0.1",
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.map((error) => error.questionId)).toEqual([
      "feedbackText",
    ])
    expect(submitFeedback).not.toHaveBeenCalled()
  })
})
