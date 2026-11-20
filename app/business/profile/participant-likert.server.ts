import type { z } from "zod"
import type { currentProfileSchema } from "~/business/auth/auth-schemas"
import { logger } from "~/lib/logger/logger.server"
import type { LikertSubmission } from "./likert-submissions.server"
import {
  getLikertSubmission,
  listLikertSubmissions,
} from "./likert-submissions.server"

type Viewer = Pick<z.infer<typeof currentProfileSchema>, "id" | "permissions">

export interface ParticipantLikert {
  submissions: { id: string; submittedAt: Date }[]
  selected: LikertSubmission | null
}

export async function getParticipantLikert({
  profileId,
  viewer,
  submissionId,
}: {
  profileId: string
  viewer: Viewer | null | undefined
  submissionId?: string | null
}): Promise<ParticipantLikert | null> {
  try {
    const submissions = await listLikertSubmissions(profileId, viewer)
    if (submissions.length === 0) return { submissions, selected: null }

    // Only an id from this person's own list is opened, so a malformed or
    // foreign id in the URL never reaches the database.
    const opened =
      submissions.find(({ id }) => id === submissionId) ?? submissions[0]

    return {
      submissions,
      selected: await getLikertSubmission(opened.id, viewer),
    }
  } catch (error) {
    logger.error("Failed to fetch Likert submissions", { profileId, error })
    return null
  }
}
