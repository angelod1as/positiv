import { DATAVIZ_EVENT_CUTOFF_DATE } from "~/lib/constants/constants"

export type DatavizRange = { from: string; to: string }

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

function readDate(value: string | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function datavizRange(
  params: URLSearchParams,
  now: Date = new Date(),
): DatavizRange {
  const firstParty = new Date(DATAVIZ_EVENT_CUTOFF_DATE)
  const from = readDate(params.get("from"))
  const start = from && from > firstParty ? from : firstParty
  const rawTo = params.get("to")
  const to = readDate(
    rawTo && DATE_ONLY.test(rawTo) ? `${rawTo}T23:59:59.999-03:00` : rawTo,
  )
  const end = to && to >= start ? to : now > start ? now : start
  return { from: start.toISOString(), to: end.toISOString() }
}

export function fullDatavizRange(now: Date = new Date()): DatavizRange {
  return datavizRange(new URLSearchParams(), now)
}
