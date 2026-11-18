import { sql } from "kysely"
import { can, PERMISSIONS } from "~/business/auth/permissions"
import { db } from "~/lib/supabase/db.server"
import type { LikertSubmissionInput } from "./likert-schema"
import { likertSubmissionSchema } from "./likert-schema"

type Viewer = { id: string; permissions?: readonly string[] | null }

export interface LikertSubmission {
  id: string
  profileId: string
  submittedAt: Date
  beenTo: string[]
  nonMonogamySince: string | null
  answers: {
    statementKey: string
    statementText: string
    answer: number
    comment: string | null
  }[]
}

const mayRead = (
  viewer: Viewer | null | undefined,
  profileId: string,
): boolean =>
  viewer?.id === profileId || can(viewer, PERMISSIONS.PROFILES_MANAGE)

export async function saveLikertSubmission(
  profileId: string,
  input: LikertSubmissionInput,
): Promise<{ id: string }> {
  const { beenTo, nonMonogamySince, answers } =
    likertSubmissionSchema.parse(input)

  return db.transaction().execute(async (trx) => {
    const saved = await trx
      .insertInto("likert_submissions")
      .values({
        profile_id: profileId,
        been_to: beenTo,
        non_monogamy_since: nonMonogamySince && `${nonMonogamySince}-01`,
      })
      .returning("id")
      .executeTakeFirstOrThrow()

    await trx
      .insertInto("likert_answers")
      .values(
        answers.map((answer, position) => ({
          submission_id: saved.id,
          position,
          statement_key: answer.statementKey,
          statement_text: answer.statementText,
          answer: answer.answer,
          comment: answer.comment,
        })),
      )
      .execute()

    return saved
  })
}

export async function listLikertSubmissions(
  profileId: string,
  viewer: Viewer | null | undefined,
): Promise<{ id: string; submittedAt: Date }[]> {
  if (!mayRead(viewer, profileId)) return []

  const rows = await db
    .selectFrom("likert_submissions")
    .select(["id", "submitted_at"])
    .where("profile_id", "=", profileId)
    .orderBy("submitted_at", "desc")
    .orderBy("id", "desc")
    .execute()

  return rows.map((row) => ({
    id: row.id,
    submittedAt: new Date(row.submitted_at),
  }))
}

export async function getLikertSubmission(
  submissionId: string,
  viewer: Viewer | null | undefined,
): Promise<LikertSubmission | null> {
  const submission = await db
    .selectFrom("likert_submissions")
    .select([
      "id",
      "profile_id",
      "submitted_at",
      "been_to",
      sql<
        string | null
      >`to_char(non_monogamy_since, 'YYYY-MM')`.as("non_monogamy_since"),
    ])
    .where("id", "=", submissionId)
    .executeTakeFirst()

  if (!submission || !mayRead(viewer, submission.profile_id)) return null

  const answers = await db
    .selectFrom("likert_answers")
    .select(["statement_key", "statement_text", "answer", "comment"])
    .where("submission_id", "=", submission.id)
    .orderBy("position")
    .execute()

  return {
    id: submission.id,
    profileId: submission.profile_id,
    submittedAt: new Date(submission.submitted_at),
    beenTo: submission.been_to,
    nonMonogamySince: submission.non_monogamy_since,
    answers: answers.map((answer) => ({
      statementKey: answer.statement_key,
      statementText: answer.statement_text,
      answer: answer.answer,
      comment: answer.comment,
    })),
  }
}

export async function hasAnsweredLikert(profileId: string): Promise<boolean> {
  const row = await db
    .selectFrom("likert_submissions")
    .select("id")
    .where("profile_id", "=", profileId)
    .limit(1)
    .executeTakeFirst()

  return row !== undefined
}
