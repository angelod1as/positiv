import { describe, expect, it } from 'vitest'
import { adminDatavizCopy } from '~/copy/admin/dataviz'
import { render, screen } from '~/test/test-utils'
import { DatavizHeader } from './dataviz-header'

const parties = [
  { title: 'Junho', emoji: '🎉', date: '2025-06-21T22:00:00.000Z', inscritos: 10 },
  { title: 'Julho', emoji: '🎉', date: '2025-07-19T22:00:00.000Z', inscritos: 10 },
]
const range = { from: '2025-06-21T00:00:00.000Z', to: '2026-01-01T00:00:00.000Z' }

describe('DatavizHeader', () => {
  it('links out to Umami for the behaviour side, in a new tab', () => {
    render(
      <DatavizHeader
        parties={parties}
        range={range}
        onRangeChange={() => {}}
        umamiUrl="https://umami.example.com/websites/site-123"
      />,
    )

    const link = screen.getByRole('link', { name: adminDatavizCopy.umamiLink })
    expect(link).toHaveAttribute('href', 'https://umami.example.com/websites/site-123')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('leaves the link out when Umami is not configured', () => {
    render(<DatavizHeader parties={parties} range={range} onRangeChange={() => {}} umamiUrl={null} />)

    expect(screen.queryByRole('link', { name: adminDatavizCopy.umamiLink })).not.toBeInTheDocument()
  })
})
