import { describe, expect, it } from 'vitest'
import { adminDatavizCopy } from '~/copy/admin/dataviz'
import { render, screen } from '~/test/test-utils'
import { rangeIndices, rangeOfIndices } from './party-range'
import { PartyRangeSelector } from './party-range-selector'

const party = (title: string, date: string) => ({ title, emoji: '🎉', date, inscritos: 10 })

const parties = [
  party('Junho', '2025-06-21T22:00:00.000Z'),
  party('Julho', '2025-07-19T22:00:00.000Z'),
  party('Agosto', '2025-08-16T22:00:00.000Z'),
]

describe('rangeIndices', () => {
  it('marks the first and last party inside the range', () => {
    expect(
      rangeIndices(parties, {
        from: '2025-07-01T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z',
      }),
    ).toEqual({ startIndex: 1, endIndex: 2 })
  })

  it('marks every party when the range holds them all', () => {
    expect(
      rangeIndices(parties, {
        from: '2025-06-21T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z',
      }),
    ).toEqual({ startIndex: 0, endIndex: 2 })
  })
})

describe('rangeOfIndices', () => {
  it('runs from the first selected party to the last one', () => {
    expect(rangeOfIndices(parties, { startIndex: 0, endIndex: 1 })).toEqual({
      from: '2025-06-21T22:00:00.000Z',
      to: '2025-07-19T22:00:00.000Z',
    })
  })
})

describe('PartyRangeSelector', () => {
  it('offers the selector when there is more than one party', () => {
    render(
      <PartyRangeSelector
        parties={parties}
        range={{ from: '2025-06-21T00:00:00.000Z', to: '2026-01-01T00:00:00.000Z' }}
        onRangeChange={() => {}}
      />,
    )

    expect(screen.getByText(adminDatavizCopy.eventRangeSelector.label)).toBeInTheDocument()
  })

  it('stays out of the way with a single party', () => {
    render(
      <PartyRangeSelector
        parties={parties.slice(0, 1)}
        range={{ from: '2025-06-21T00:00:00.000Z', to: '2026-01-01T00:00:00.000Z' }}
        onRangeChange={() => {}}
      />,
    )

    expect(
      screen.queryByText(adminDatavizCopy.eventRangeSelector.label),
    ).not.toBeInTheDocument()
  })
})
