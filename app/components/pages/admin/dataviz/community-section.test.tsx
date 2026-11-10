import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { DemographicsDataResult } from '~/business/reporting/dataviz/dataviz.types'
import { render, screen, within } from '~/test/test-utils'
import { CommunitySection } from './community-section'

const demographics: DemographicsDataResult = {
  gender: [
    { category: 'Mulher cis', count: 60, percentage: 60 },
    { category: 'Homem cis', count: 40, percentage: 40 },
  ],
  orientation: [{ category: 'Bissexual', count: 50, percentage: 100 }],
  age: [{ category: '25-29', count: 30, percentage: 100 }],
  race: [],
}

const renderSection = (onModeChange = vi.fn()) =>
  render(
    <CommunitySection
      demographics={demographics}
      growth={[{ month: '2025-07', new_profiles: 500, cumulative: 510 }]}
      retention={[{ events_attended: 1, num_people: 100 }]}
      demographicsMode="all"
      onModeChange={onModeChange}
      totalProfiles={90}
      filledProfilesAge={30}
    />,
  )

const chartTitled = (title: string) => {
  const chart = screen.getByRole('heading', { level: 2, name: title }).closest('section')
  if (!chart) throw new Error(`No chart titled ${title}`)
  return within(chart)
}

describe('CommunitySection', () => {
  it('draws every community chart as a Chart Section, in order', () => {
    renderSection()

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual([
      'Comunidade',
      'Identidade de Gênero',
      'Orientação Sexual',
      'Faixa Etária',
      'Raça/Cor',
      'Novos cadastros',
      'Total acumulado',
      'Retenção',
    ])
  })

  it('opens the same figures as a table', async () => {
    renderSection()

    const gender = chartTitled('Identidade de Gênero')
    await userEvent.click(gender.getByRole('button', { name: 'Ver dados' }))

    expect(gender.getByRole('rowheader', { name: 'Mulher cis · 60' })).toBeInTheDocument()
    expect(gender.getByRole('cell', { name: '60%' })).toBeInTheDocument()
  })

  it('says so when a chart has nothing to draw', () => {
    renderSection()

    const race = chartTitled('Raça/Cor')
    expect(race.getByText('Nenhum dado disponível')).toBeInTheDocument()
    expect(race.queryByRole('button', { name: 'Ver dados' })).toBeNull()
  })

  it('switches every demographic chart with one toggle', async () => {
    const onModeChange = vi.fn()
    renderSection(onModeChange)

    expect(screen.getAllByRole('button', { name: 'Quem já compareceu' })).toHaveLength(1)
    await userEvent.click(screen.getByRole('button', { name: 'Quem já compareceu' }))

    expect(onModeChange).toHaveBeenCalledWith('attended')
  })
})
