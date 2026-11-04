import type { z } from "zod"
import type { statUnitSchema } from "~/business/cms/page.schema"
import { homepageCopy } from "~/copy/homepage"

export type StatUnit = z.infer<typeof statUnitSchema>

// A value keeps the decimals the Editor typed, up to two; a computed change
// gets one, enough to tell 33,3% from 33%.
const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 })
const change = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })
const reais = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 })
const cents = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// Built by hand rather than with style "currency" or "percent": Intl puts a
// non-breaking space after R$, and percent style expects 0.14 for 14%.
export function formatStatValue(value: number, unit: StatUnit): string {
  switch (unit) {
    case "none":
      return written(value)
    case "percent":
      return `${written(value)}%`
    case "brl": {
      const amount = Math.abs(value)
      const written = (Number.isInteger(amount) ? reais : cents).format(amount)
      const negative = value < 0 && /[1-9]/.test(written)
      return `${negative ? "-" : ""}R$ ${written}`
    }
  }
}

function written(value: number) {
  const rounded = decimal.format(value)
  return rounded === "-0" ? "0" : rounded
}

export function formatStatChange(
  before: number,
  after: number,
  unit: StatUnit,
): string | null {
  if (unit === "percent") {
    return homepageCopy.stats.percentagePoints(signed(after - before))
  }
  if (before === 0) return null
  return `${signed(((after - before) / Math.abs(before)) * 100)}%`
}

function signed(value: number) {
  const rounded = change.format(value)
  if (rounded === "0" || rounded === "-0") return "0"
  return value > 0 ? `+${rounded}` : rounded
}
