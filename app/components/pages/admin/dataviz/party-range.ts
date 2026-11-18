import type { DatavizRange } from '~/business/reporting/dataviz/dataviz-range'

export type Party = { title: string; emoji: string; date: string; inscritos: number }
type Indices = { startIndex: number; endIndex: number }

export function rangeIndices(parties: Party[], range: DatavizRange): Indices {
  const inside = parties
    .map((party, index) => ({ party, index }))
    .filter(({ party }) => party.date >= range.from && party.date <= range.to)
  const last = Math.max(parties.length - 1, 0)
  return {
    startIndex: inside[0]?.index ?? 0,
    endIndex: inside.at(-1)?.index ?? last,
  }
}

export function rangeOfIndices(parties: Party[], indices: Indices): DatavizRange {
  return {
    from: parties[indices.startIndex].date,
    to: parties[indices.endIndex].date,
  }
}
