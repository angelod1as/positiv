import { useEffect, useMemo, useRef, useState } from 'react'
import type { DatavizRange } from '~/business/reporting/dataviz/dataviz-range'
import { buildEventLabel } from './chart-utils'
import { EventRangeSelector } from './event-range-selector'
import { type Party, rangeIndices, rangeOfIndices } from './party-range'

const COMMIT_DELAY_MS = 400

type PartyRangeSelectorProps = {
  parties: Party[]
  range: DatavizRange
  onRangeChange: (range: DatavizRange) => void
}

export function PartyRangeSelector({ parties, range, onRangeChange }: PartyRangeSelectorProps) {
  const [indices, setIndices] = useState(() => rangeIndices(parties, range))
  const commit = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => setIndices(rangeIndices(parties, range)), [parties, range])
  useEffect(() => () => clearTimeout(commit.current), [])

  const data = useMemo(
    () => parties.map((party) => ({ label: buildEventLabel(party), inscritos: party.inscritos })),
    [parties],
  )

  const onChange = (update: { startIndex?: number; endIndex?: number }) => {
    const next = {
      startIndex: update.startIndex ?? indices.startIndex,
      endIndex: update.endIndex ?? indices.endIndex,
    }
    setIndices(next)
    clearTimeout(commit.current)
    commit.current = setTimeout(() => onRangeChange(rangeOfIndices(parties, next)), COMMIT_DELAY_MS)
  }

  return (
    <EventRangeSelector
      data={data}
      startIndex={indices.startIndex}
      endIndex={indices.endIndex}
      onChange={onChange}
    />
  )
}
