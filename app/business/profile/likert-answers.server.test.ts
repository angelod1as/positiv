import { beforeEach, describe, expect, it, vi } from "vitest"
import { likertScaleCache } from "~/business/cms/likert-scale-cache.server"
import {
  isLikertEnabled,
  isLikertRequired,
} from "~/business/settings/app-settings.server"
import { PERMISSIONS } from "~/business/auth/permissions"
import { likertPageCopy } from "~/copy/account"
import { canSeeLikert, submitLikertAnswers } from "./likert-answers.server"
import { saveLikertSubmission } from "./likert-submissions.server"

vi.mock("~/business/cms/likert-scale-cache.server", () => ({
  likertScaleCache: { get: vi.fn() },
}))

vi.mock("~/business/settings/app-settings.server", () => ({
  isLikertEnabled: vi.fn(),
  isLikertRequired: vi.fn(),
}))

vi.mock("./likert-submissions.server", () => ({
  saveLikertSubmission: vi.fn(),
}))

const person = { id: "profile-1", permissions: [] }
const admin = { id: "admin-1", permissions: [PERMISSIONS.ADMIN_PANEL] }

const scale = {
  statements: [{ key: "ciume", text: "Sinto ciúme e tudo bem." }],
}

describe("canSeeLikert", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isLikertRequired).mockResolvedValue(false)
  })

  it("lets anyone signed in with the link see the scale while it is open", async () => {
    vi.mocked(isLikertEnabled).mockResolvedValue(true)

    expect(await canSeeLikert(person)).toBe(true)
  })

  it("hides it from a participant while it is switched off", async () => {
    vi.mocked(isLikertEnabled).mockResolvedValue(false)

    expect(await canSeeLikert(person)).toBe(false)
  })

  it("shows it to an admin while it is switched off", async () => {
    vi.mocked(isLikertEnabled).mockResolvedValue(false)

    expect(await canSeeLikert(admin)).toBe(true)
  })

  it("lets anyone signed in see it once it is required, even while closed", async () => {
    vi.mocked(isLikertEnabled).mockResolvedValue(false)
    vi.mocked(isLikertRequired).mockResolvedValue(true)

    expect(await canSeeLikert(person)).toBe(true)
  })

  it("hides it from someone signed out", async () => {
    vi.mocked(isLikertEnabled).mockResolvedValue(true)

    expect(await canSeeLikert(null)).toBe(false)
  })
})

describe("submitLikertAnswers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isLikertEnabled).mockResolvedValue(true)
    vi.mocked(isLikertRequired).mockResolvedValue(false)
    vi.mocked(likertScaleCache.get).mockResolvedValue(scale)
    vi.mocked(saveLikertSubmission).mockResolvedValue({ id: "submission-1" })
  })

  it("saves the answers against the published scale, for the viewer", async () => {
    const result = await submitLikertAnswers({
      answers: { ciume: { choice: "agree", comment: "às vezes" } },
      viewer: person,
    })

    expect(result).toEqual({ ok: true })
    expect(saveLikertSubmission).toHaveBeenCalledWith(person, {
      beenTo: [],
      nonMonogamySince: null,
      answers: [
        {
          statementKey: "ciume",
          statementText: "Sinto ciúme e tudo bem.",
          answer: 4,
          comment: "às vezes",
        },
      ],
    })
  })

  it("refuses answers that no longer match the scale, asking for a reload", async () => {
    const result = await submitLikertAnswers({
      answers: { antiga: { choice: "agree" } },
      viewer: person,
    })

    expect(result).toEqual({
      ok: false,
      errors: [],
      message: likertPageCopy.scaleChanged,
    })
    expect(saveLikertSubmission).not.toHaveBeenCalled()
  })

  it("refuses when the scale is not published", async () => {
    vi.mocked(likertScaleCache.get).mockResolvedValue(null)

    const result = await submitLikertAnswers({
      answers: { ciume: { choice: "agree" } },
      viewer: person,
    })

    expect(result).toEqual({
      ok: false,
      errors: [],
      message: likertPageCopy.unavailable,
    })
    expect(saveLikertSubmission).not.toHaveBeenCalled()
  })

  it("refuses a participant while the scale is switched off", async () => {
    vi.mocked(isLikertEnabled).mockResolvedValue(false)

    const result = await submitLikertAnswers({
      answers: { ciume: { choice: "agree" } },
      viewer: person,
    })

    expect(result).toEqual({
      ok: false,
      errors: [],
      message: likertPageCopy.unavailable,
    })
    expect(saveLikertSubmission).not.toHaveBeenCalled()
  })

  it("refuses someone signed out", async () => {
    const result = await submitLikertAnswers({
      answers: { ciume: { choice: "agree" } },
      viewer: null,
    })

    expect(result.ok).toBe(false)
    expect(saveLikertSubmission).not.toHaveBeenCalled()
  })
})
