import { zod } from "~/lib/helpers/zod"
import { monthYearCopy } from "~/copy/forms"

/**
 * Either the person opted out, or a month (1–12) and a year — each may be
 * missing while the answer is still being filled in.
 */
export type MonthYearAnswer = { none: true } | { month?: number; year?: number }

const isMonth = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 12

export const monthYearSchema = zod.unknown().superRefine((value, ctx) => {
  const answer = (typeof value === "object" && value !== null ? value : {}) as {
    none?: unknown
    month?: unknown
    year?: unknown
  }

  if (answer.none === true) return

  if (!isMonth(answer.month) || !Number.isInteger(answer.year)) {
    ctx.addIssue({ code: "custom", message: monthYearCopy.incomplete })
    return
  }

  const today = new Date()
  const asked = (answer.year as number) * 12 + answer.month
  const current = today.getFullYear() * 12 + today.getMonth() + 1

  if (asked > current) {
    ctx.addIssue({ code: "custom", message: monthYearCopy.future })
  }
})
