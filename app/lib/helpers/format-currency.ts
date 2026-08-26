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

/**
 * Reais to cents.
 *
 * The separator decides how to read the string. The price field is an
 * `<input type="number">`, whose value is always a plain period-decimal string
 * (`"150.55"`) — a comma cannot be typed into it, and `centsToReaisInput` fills
 * it with the same shape. So a period on its own is the decimal point, and
 * reading it as a thousands separator inflates every price that is not a whole
 * number of reais by ten or a hundred.
 *
 * A comma can only have come from somewhere a person wrote the amount out
 * (`"1.234,56"`), and there the period is the thousands separator.
 */
export function reaisToCents(input: string | number): number {
  if (typeof input === "number") return Math.round(input * 100)
  const trimmed = input.trim()
  if (trimmed === "") return Number.NaN
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed
  const parsed = Number(normalized)
  if (Number.isNaN(parsed)) return Number.NaN
  return Math.round(parsed * 100)
}

/** Cents to the plain decimal string a number input shows (`"220.5"`). */
export function centsToReaisInput(cents: number | null | undefined): string {
  return String(Number(cents ?? 0) / 100)
}
