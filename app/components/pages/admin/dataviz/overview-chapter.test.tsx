import { describe, expect, it } from 'vitest'
import { render, screen, within } from '~/test/test-utils'
import { OverviewChapter } from './overview-chapter'
import { kpis, summary } from './chapter-fixtures'

const section = (title: string) => {
  const found = screen.getByRole('heading', { level: 2, name: title }).closest('section')
  if (!found) throw new Error(`No section titled ${title}`)
  return within(found)
}

describe('OverviewChapter', () => {
  it('opens with the parties, people and applications in the range', () => {
    render(<OverviewChapter summary={summary} kpis={kpis} />)

    const cards = section('Visão geral').getAllByRole('listitem')
    expect(cards.map((card) => card.textContent)).toEqual([
      '7Festas',
      '196Pessoas foram às festas',
      '312Inscrições',
    ])
  })

  it('keeps the register numbers apart, marked as internal', () => {
    render(<OverviewChapter summary={summary} kpis={kpis} />)

    const cards = section('Cadastro · Interno').getAllByRole('listitem')
    expect(cards.map((card) => card.textContent)).toEqual([
      '1.259Perfis cadastrados',
      '280Perfis aprovados para participar',
      '12Perfis sinalizados · Amarelo + Vermelho',
    ])
  })
})
