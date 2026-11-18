import { logger } from "~/lib/logger/logger.server"
import { zod } from "~/lib/helpers/zod"
import { likertScaleQuery } from "./likert-scale-query"
import { type LikertScale, likertScaleSchema } from "./likert-scale.schema"
import { createSanityClient } from "./sanity-client.server"

type LikertScaleClient = { fetch(query: string): Promise<unknown> }

// There is no copy of the scale in code: without a valid published scale the
// app has nothing to ask, so the caller decides what to show instead.
export async function getLikertScale(
  client: LikertScaleClient = createSanityClient(),
): Promise<LikertScale | null> {
  const document = await client.fetch(likertScaleQuery)
  if (document === null || document === undefined) {
    logger.error("The Likert scale is not published")
    return null
  }

  const result = likertScaleSchema.safeParse(document)
  if (result.success) return result.data
  logger.error("The Likert scale failed validation", {
    error: zod.prettifyError(result.error),
  })
  return null
}
