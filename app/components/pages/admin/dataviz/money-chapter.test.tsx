import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '~/test/test-utils'
import { revenue, summary } from './chapter-fixtures'
import { MoneyChapter } from './money-chapter'

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  }
})

const card = (caption: string) => {
  const found = screen.getByText(caption).closest('li')
  if (!found) throw new Error(`No card captioned ${caption}`)
  return within(found)
}

describe('MoneyChapter', () => {
  it('shows the social spots first, then the money, marked as internal', () => {
    render(<MoneyChapter summary={summary} revenue={revenue} />)

    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Dinheiro',
      'Vagas sociais',
      'Receita · Interno',
      'Faturamento por Evento · Interno',
      'Preço do ingresso · Interno',
    ])
  })

  it('counts the social spots, per party and as a share of attendances', () => {
    render(<MoneyChapter summary={summary} revenue={revenue} />)

    expect(card('Vagas sociais usadas').getByText('31')).toBeInTheDocument()
    expect(card('Vagas sociais por festa').getByText('4,4')).toBeInTheDocument()
    expect(card('Das presenças foram vagas sociais').getByText('8,1%')).toBeInTheDocument()
  })

  it('sums the money over the parties in the range, in reais', () => {
    render(<MoneyChapter summary={summary} revenue={revenue} />)

    expect(card('Receita líquida').getByText('R$ 19.000')).toBeInTheDocument()
    expect(card('Receita bruta').getByText('R$ 19.500')).toBeInTheDocument()
    expect(card('Receita líquida por festa').getByText('R$ 9.500')).toBeInTheDocument()
    expect(card('Reembolsos').getByText('R$ 500')).toBeInTheDocument()
    expect(card('Ticket médio').getByText('R$ 200')).toBeInTheDocument()
    expect(card('Dos pagamentos foram no cartão').getByText('20%')).toBeInTheDocument()
  })
})
