import { zod } from "~/lib/helpers/zod"
import { yearCopy } from "~/copy/forms"

/** The earliest year offered, and the earliest one accepted. */
export const FIRST_YEAR = 1950

/** Either the person opted out, or the year they picked. */
export type YearAnswer = { none: true } | { year: number }

export const yearSchema = zod.unknown().superRefine((value, ctx) => {
  const answer = (typeof value === "object" && value !== null ? value : {}) as {
    none?: unknown
    year?: unknown
  }

  if (answer.none === true) return

  if (!Number.isInteger(answer.year)) {
    ctx.addIssue({ code: "custom", message: yearCopy.required })
    return
  }

  if ((answer.year as number) < FIRST_YEAR) {
    ctx.addIssue({ code: "custom", message: yearCopy.tooEarly(FIRST_YEAR) })
    return
  }

  if ((answer.year as number) > new Date().getFullYear()) {
    ctx.addIssue({ code: "custom", message: yearCopy.future })
  }
})
