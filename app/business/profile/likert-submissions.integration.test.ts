import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { PERMISSIONS } from "~/business/auth/permissions"
import { createTestProfile } from "~/test/db-test-utils"
import {
  cleanupAfterTest,
  setupIntegrationTest,
} from "~/test/integration-setup"
import type { LikertSubmissionInput } from "./likert-schema"
import {
  getLikertSubmission,
  hasAnsweredLikert,
  listLikertSubmissions,
  saveLikertSubmission,
} from "./likert-submissions.server"

describe("Likert submissions", () => {
  const { tracker, kysely } = setupIntegrationTest()

  const aProfile = (label: string) =>
    createTestProfile(tracker, kysely, {
      user_id: null,
      full_name: label,
      email: `likert-${label}-${Date.now()}-${Math.random()}@example.com`,
    })

  const viewerFor = (profile: { id: string }) => ({
    id: profile.id,
    permissions: [],
  })

  const anAdmin = {
    id: "00000000-0000-4000-8000-0000000000ad",
    permissions: [PERMISSIONS.ADMIN_PANEL, PERMISSIONS.PROFILES_MANAGE],
  }

  const submission = (
    overrides: Partial<LikertSubmissionInput> = {},
  ): LikertSubmissionInput => ({
    beenTo: ["Positiv", "Outra festa"],
    nonMonogamySince: "2019-03",
    answers: [
      {
        statementKey: "consent",
        statementText: "Consentimento se pergunta.",
        answer: 5,
        comment: "Sempre.",
      },
      {
        statementKey: "jealousy",
        statementText: "Ciúme é natural.",
        answer: 3,
      },
    ],
    ...overrides,
  })

  beforeEach(() => {
    tracker.clear()
  })

  afterEach(async () => {
    await cleanupAfterTest(tracker, kysely)
  })

  describe("saving and reading back", () => {
    it("should give the person back what they submitted, in the order they saw it", async () => {
      const person = await aProfile("owner")

      const { id } = await saveLikertSubmission(person.id, submission())
      const saved = await getLikertSubmission(id, viewerFor(person))

      expect(saved).toEqual({
        id,
        profileId: person.id,
        submittedAt: expect.any(Date),
        beenTo: ["Positiv", "Outra festa"],
        nonMonogamySince: "2019-03",
        answers: [
          {
            statementKey: "consent",
            statementText: "Consentimento se pergunta.",
            answer: 5,
            comment: "Sempre.",
          },
          {
            statementKey: "jealousy",
            statementText: "Ciúme é natural.",
            answer: 3,
            comment: null,
          },
        ],
      })
    })

    it("should keep someone who does not live non-monogamy today", async () => {
      const person = await aProfile("not-today")

      const { id } = await saveLikertSubmission(
        person.id,
        submission({ nonMonogamySince: null }),
      )

      const saved = await getLikertSubmission(id, viewerFor(person))
      expect(saved?.nonMonogamySince).toBeNull()
    })

    it("should refuse an invalid submission and store nothing", async () => {
      const person = await aProfile("invalid")

      await expect(
        saveLikertSubmission(person.id, submission({ answers: [] })),
      ).rejects.toThrow()

      expect(await hasAnsweredLikert(person.id)).toBe(false)
    })
  })

  describe("history", () => {
    it("should keep every submission, newest first, and leave the older ones as they were", async () => {
      const person = await aProfile("history")

      const first = await saveLikertSubmission(person.id, submission())
      const second = await saveLikertSubmission(
        person.id,
        submission({
          answers: [
            {
              statementKey: "consent",
              statementText: "Consentimento se pergunta, sempre.",
              answer: 4,
            },
          ],
        }),
      )

      const list = await listLikertSubmissions(person.id, viewerFor(person))
      expect(list.map(({ id }) => id)).toEqual([second.id, first.id])

      const older = await getLikertSubmission(first.id, viewerFor(person))
      expect(older?.answers[0]).toMatchObject({
        statementText: "Consentimento se pergunta.",
        answer: 5,
      })
    })
  })

  describe("who reads", () => {
    it("should not let one person read another's submission", async () => {
      const owner = await aProfile("private-owner")
      const someoneElse = await aProfile("someone-else")
      const { id } = await saveLikertSubmission(owner.id, submission())

      expect(await getLikertSubmission(id, viewerFor(someoneElse))).toBeNull()
      expect(
        await listLikertSubmissions(owner.id, viewerFor(someoneElse)),
      ).toEqual([])
    })

    it("should not let someone signed out read a submission", async () => {
      const owner = await aProfile("signed-out-owner")
      const { id } = await saveLikertSubmission(owner.id, submission())

      expect(await getLikertSubmission(id, null)).toBeNull()
      expect(await listLikertSubmissions(owner.id, null)).toEqual([])
    })

    it("should let an admin read anyone's submissions", async () => {
      const owner = await aProfile("admin-read-owner")
      const { id } = await saveLikertSubmission(owner.id, submission())

      expect(await getLikertSubmission(id, anAdmin)).toMatchObject({
        id,
        profileId: owner.id,
      })
      expect(
        (await listLikertSubmissions(owner.id, anAdmin)).map((s) => s.id),
      ).toEqual([id])
    })

    it("should not treat the admin panel alone as leave to read", async () => {
      const owner = await aProfile("panel-only-owner")
      const { id } = await saveLikertSubmission(owner.id, submission())
      const panelOnly = { ...anAdmin, permissions: [PERMISSIONS.ADMIN_PANEL] }

      expect(await getLikertSubmission(id, panelOnly)).toBeNull()
    })
  })

  describe("has this person answered?", () => {
    it("should say no before the first submission and yes after it", async () => {
      const person = await aProfile("first-time")

      expect(await hasAnsweredLikert(person.id)).toBe(false)

      await saveLikertSubmission(person.id, submission())

      expect(await hasAnsweredLikert(person.id)).toBe(true)
    })

    it("should not count someone else's submission", async () => {
      const person = await aProfile("not-answered")
      const other = await aProfile("answered")
      await saveLikertSubmission(other.id, submission())

      expect(await hasAnsweredLikert(person.id)).toBe(false)
    })
  })

  describe("deleting the account", () => {
    it("should delete every submission and answer with the profile", async () => {
      const person = await aProfile("deleted")
      const { id } = await saveLikertSubmission(person.id, submission())
      expect(await getLikertSubmission(id, viewerFor(person))).not.toBeNull()

      await kysely.deleteFrom("profiles").where("id", "=", person.id).execute()

      const submissions = await kysely
        .selectFrom("likert_submissions")
        .select("id")
        .where("profile_id", "=", person.id)
        .execute()
      const answers = await kysely
        .selectFrom("likert_answers")
        .select("id")
        .where("submission_id", "=", id)
        .execute()

      expect(submissions).toEqual([])
      expect(answers).toEqual([])
    })
  })
})
