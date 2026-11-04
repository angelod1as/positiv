import type { z } from "zod"
import type { statUnitSchema } from "~/business/cms/page.schema"

export type StatUnit = z.infer<typeof statUnitSchema>

const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })
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
      return decimal.format(value)
    case "percent":
      return `${decimal.format(value)}%`
    case "brl": {
      const amount = Math.abs(value)
      const format = Number.isInteger(amount) ? reais : cents
      return `${value < 0 ? "-" : ""}R$ ${format.format(amount)}`
    }
  }
}

export function formatStatChange(
  before: number,
  after: number,
  unit: StatUnit,
): string | null {
  if (unit === "percent") return `${signed(after - before)} p.p.`
  if (before === 0) return null
  return `${signed(((after - before) / Math.abs(before)) * 100)}%`
}

function signed(change: number) {
  const rounded = decimal.format(change)
  return change > 0 && rounded !== "0" ? `+${rounded}` : rounded
}
