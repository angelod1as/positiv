import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '~/test/test-utils'
import {
  demographics,
  growth,
  kpis,
  retention,
  summary,
  veteranRookie,
} from './chapter-fixtures'
import { PeopleChapter } from './people-chapter'

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  }
})

const renderChapter = (overrides: Partial<Parameters<typeof PeopleChapter>[0]> = {}) =>
  render(
    <PeopleChapter
      summary={summary}
      kpis={kpis}
      veteranRookie={veteranRookie}
      retention={retention}
      demographics={demographics}
      growth={growth}
      demographicsMode="attended"
      onModeChange={() => {}}
      {...overrides}
    />,
  )

const card = (caption: string) => {
  const found = screen.getByText(caption).closest('li')
  if (!found) throw new Error(`No card captioned ${caption}`)
  return within(found)
}

describe('PeopleChapter', () => {
  it('puts the report charts first and the internal ones after, marked', () => {
    renderChapter()

    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Pessoas',
      'Novates e veteranes no intervalo',
      'Veteranes e Novates',
      'Retenção',
      'Faixa Etária',
      'Orientação Sexual',
      'Frequência · Interno',
      'Identidade de Gênero · Interno',
      'Raça/Cor · Interno',
      'Novos cadastros · Interno',
    ])
  })

  it('shows who came back, who came twice or more and the ages, as the report does', () => {
    renderChapter()

    expect(card('Das novates voltaram a outra festa').getByText('38,1%')).toBeInTheDocument()
    expect(card('Foram a duas festas ou mais').getByText('89')).toBeInTheDocument()
    expect(card('Idade · menor, média e maior').getByText('37,4')).toBeInTheDocument()
  })

  it('counts the newcomers and the regulars as internal numbers', () => {
    renderChapter()

    expect(card('Novates no intervalo').getByText('84')).toBeInTheDocument()
    expect(card('Foram a três festas ou mais').getByText('49')).toBeInTheDocument()
    expect(card('Foram a cinco festas ou mais').getByText('11')).toBeInTheDocument()
  })

  it('keeps three cards when nobody gave a date of birth', () => {
    renderChapter({ summary: { ...summary, age: null } })

    expect(card('Idade · menor, média e maior').getByText('0')).toBeInTheDocument()
  })
})
