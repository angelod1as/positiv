import { logger } from "~/lib/logger/logger.server"
import { zod } from "~/lib/helpers/zod"
import { rulesQuery } from "./rules-query"
import { type Rules, rulesSchema } from "./rules.schema"
import { createSanityClient } from "./sanity-client.server"

type RulesClient = { fetch(query: string): Promise<unknown> }

// There is no copy of the Rules in code: without valid published Rules the
// caller decides what to show instead.
export async function getRules(
  client: RulesClient = createSanityClient(),
): Promise<Rules | null> {
  const document = await client.fetch(rulesQuery)
  if (document === null || document === undefined) {
    logger.error("The Rules are not published")
    return null
  }

  const result = rulesSchema.safeParse(document)
  if (result.success) return result.data
  logger.error("The Rules failed validation", {
    error: zod.prettifyError(result.error),
  })
  return null
}
