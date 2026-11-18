import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '~/test/test-utils'
import { attendance, funnel, kpis, occupancy, seasonality, summary, timing } from './chapter-fixtures'
import { PartiesChapter } from './parties-chapter'

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  }
})

const renderChapter = () =>
  render(
    <PartiesChapter
      summary={summary}
      kpis={kpis}
      attendance={attendance}
      funnel={funnel}
      occupancy={occupancy}
      timing={timing}
      seasonality={seasonality}
    />,
  )

const card = (caption: string) => {
  const found = screen.getByText(caption).closest('li')
  if (!found) throw new Error(`No card captioned ${caption}`)
  return within(found)
}

describe('PartiesChapter', () => {
  it('puts the report charts first and the internal ones after, marked', () => {
    renderChapter()

    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Festas',
      'Presença por Evento',
      'Operação · Interno',
      'Funil de Conversão · Interno',
      'Conversão por Evento · Interno',
      'Ocupação · Interno',
      'Antecedência · Interno',
      'Sazonalidade · Interno',
    ])
  })

  it('shows the report numbers in three cards', () => {
    renderChapter()

    expect(card('Das pessoas que se inscreveram entraram').getByText('60,6%')).toBeInTheDocument()
    expect(card('Pessoas por festa').getByText('54,9')).toBeInTheDocument()
    expect(card('Na festa mais cheia').getByText('62')).toBeInTheDocument()
  })

  it('adds no-show, occupancy and the applications not selected', () => {
    renderChapter()

    expect(card('Não foram depois de confirmar').getByText('5%')).toBeInTheDocument()
    expect(card('Ocupação média das vagas').getByText('75%')).toBeInTheDocument()
    expect(card('Inscrições não selecionadas').getByText('17')).toBeInTheDocument()
  })
})
