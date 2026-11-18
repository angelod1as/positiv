import { DATAVIZ_EVENT_CUTOFF_DATE } from "~/lib/constants/constants"

export type DatavizRange = { from: string; to: string }

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
  const to = readDate(params.get("to"))
  const end = to && to >= start ? to : now > start ? now : start
  return { from: start.toISOString(), to: end.toISOString() }
}

export function fullDatavizRange(now: Date = new Date()): DatavizRange {
  return datavizRange(new URLSearchParams(), now)
}
