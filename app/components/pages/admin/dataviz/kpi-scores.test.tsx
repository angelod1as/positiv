import { describe, expect, it } from 'vitest'
import type { KpiScores as KpiScoresData } from '~/business/reporting/dataviz/dataviz.types'
import { render, screen, within } from '~/test/test-utils'
import { KpiScores } from './kpi-scores'

const mockKpiData: KpiScoresData = {
  total_profiles: 945,
  total_veterans: 207,
  total_approved: 280,
  total_events_completed: 15,
  total_unique_attendees: 188,
  avg_attendance_per_event: 51,
  avg_occupancy_pct: 75,
  total_revenue: 7495550,
  avg_revenue_per_event: 1070800,
  avg_ticket_price: 12500,
  total_flagged: 1220,
  attended_3_plus: 49,
  attended_5_plus: 11,
  avg_no_show_rate: 5,
}

const attendance = [{ compareceram: 30 }, { compareceram: 72 }, { compareceram: 51 }]

const renderScores = (data: KpiScoresData = mockKpiData) =>
  render(<KpiScores data={data} attendance={attendance} />)

const cardFor = (caption: string) => {
  const card = screen.getByText(caption).closest('li')
  if (!card) throw new Error(`No card captioned ${caption}`)
  return within(card)
}

const groupFor = (title: string) => {
  const group = screen.getByRole('heading', { level: 2, name: title }).closest('section')
  if (!group) throw new Error(`No group titled ${title}`)
  return within(group)
}

describe('KpiScores', () => {
  it('groups the cards under one Stats Section per area', () => {
    renderScores()

    expect(groupFor('Comunidade').getAllByRole('listitem')).toHaveLength(1)
    expect(groupFor('Engajamento').getAllByRole('listitem')).toHaveLength(4)
    expect(groupFor('Receita').getAllByRole('listitem')).toHaveLength(2)
    expect(groupFor('Saúde').getAllByRole('listitem')).toHaveLength(2)
  })

  it('shows the total of profiles', () => {
    renderScores()

    expect(cardFor('Total de perfis').getByText('945')).toBeInTheDocument()
  })

  it('splits the profiles into veterans and rookies, and approved and not', () => {
    renderScores()

    expect(groupFor('Veteranes entre os perfis').getByText('Veteranes · 22%')).toBeInTheDocument()
    expect(groupFor('Veteranes entre os perfis').getByText('207')).toBeInTheDocument()
    expect(groupFor('Veteranes entre os perfis').getByText('Novates · 78%')).toBeInTheDocument()
    expect(groupFor('Veteranes entre os perfis').getByText('738')).toBeInTheDocument()
    expect(groupFor('Aprovação').getByText('Aprovades · 30%')).toBeInTheDocument()
    expect(groupFor('Aprovação').getByText('Não aprovades · 70%')).toBeInTheDocument()
    expect(groupFor('Aprovação').getByText('665')).toBeInTheDocument()
  })

  it('shows the engagement counts', () => {
    renderScores()

    expect(cardFor('Participantes únicos').getByText('188')).toBeInTheDocument()
    expect(cardFor('Média de presença · Por evento').getByText('51')).toBeInTheDocument()
    expect(cardFor('Compareceram 3+ vezes').getByText('49')).toBeInTheDocument()
    expect(cardFor('Compareceram 5+ vezes').getByText('11')).toBeInTheDocument()
  })

  it('shows the average attendance between the smallest and the largest event', () => {
    renderScores()

    const average = cardFor('Média de presença · Por evento')
    expect(average.getByText('51')).toBeInTheDocument()
    expect(average.getByText('30')).toBeInTheDocument()
    expect(average.getByText('72')).toBeInTheDocument()
  })

  it('shows the average alone when no event has been held', () => {
    render(<KpiScores data={mockKpiData} attendance={[]} />)

    expect(cardFor('Média de presença · Por evento').getByText('51')).toBeInTheDocument()
    expect(screen.queryByText('mín.')).toBeNull()
  })

  it('writes the revenue in reais, keeping the cents when there are any', () => {
    renderScores()

    expect(cardFor('Receita total').getByText('R$ 74.955,50')).toBeInTheDocument()
    expect(cardFor('Média por evento').getByText('R$ 10.708')).toBeInTheDocument()
  })

  it('shows the health figures', () => {
    renderScores()

    expect(cardFor('Taxa média de no-show').getByText('5%')).toBeInTheDocument()
    expect(
      cardFor('Perfis sinalizados · Amarelo + Vermelho').getByText('1.220'),
    ).toBeInTheDocument()
  })

  it('counts no share when there are no profiles yet', () => {
    renderScores({ ...mockKpiData, total_profiles: 0 })

    expect(groupFor('Veteranes entre os perfis').getByText('Veteranes · 0%')).toBeInTheDocument()
  })
})
