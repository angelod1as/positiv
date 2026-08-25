/**
 * Money is stored and passed around as an integer number of cents; this is the
 * only place that turns it into something a person reads.
 *
 * The space after `R$` is a regular one. `Intl` with `style: "currency"` emits
 * a non-breaking space, which looks identical in a diff and fails every
 * assertion written by hand.
 */
const decimalFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCurrency(cents: number | null | undefined): string {
  const value = Number(cents ?? 0)
  const sign = value < 0 ? "-" : ""
  return `${sign}R$ ${decimalFormatter.format(Math.abs(value) / 100)}`
}

/** Same, but a non-negative amount is marked with an explicit `+`. */
export function formatSignedCurrency(cents: number | null | undefined): string {
  const value = Number(cents ?? 0)
  return value >= 0 ? `+${formatCurrency(value)}` : formatCurrency(value)
}

/** Reais typed by an admin (`"220"`, `"220,50"`, `"1.234,56"`) to cents. */
export function reaisToCents(input: string | number): number {
  if (typeof input === "number") return Math.round(input * 100)
  const normalized = input.trim().replace(/\./g, "").replace(",", ".")
  if (normalized === "") return Number.NaN
  const parsed = Number(normalized)
  if (Number.isNaN(parsed)) return Number.NaN
  return Math.round(parsed * 100)
}

/** Cents to the plain decimal string a number input shows (`"220.5"`). */
export function centsToReaisInput(cents: number | null | undefined): string {
  return String(Number(cents ?? 0) / 100)
}
