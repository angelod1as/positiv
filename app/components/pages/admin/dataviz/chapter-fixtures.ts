import type { KpiScores, PartySummary } from '~/business/reporting/dataviz/dataviz.types'

export const summary: PartySummary = {
  parties: 7,
  people: 196,
  attendances: 384,
  applications: 312,
  acceptance_rate: 60.6,
  avg_people_per_party: 54.9,
  max_people_per_party: 62,
  newcomers: 84,
  newcomers_returned: 32,
  repeat_people: 89,
  age: { min: 22, avg: 37.4, max: 57 },
  social_spots: 31,
}

export const kpis: KpiScores = {
  total_profiles: 1259,
  total_veterans: 207,
  total_approved: 280,
  total_events_completed: 7,
  total_unique_attendees: 196,
  avg_attendance_per_event: 55,
  avg_occupancy_pct: 75,
  total_revenue: 7495550,
  avg_revenue_per_event: 1070800,
  avg_ticket_price: 12500,
  total_flagged: 12,
  attended_3_plus: 49,
  attended_5_plus: 11,
  avg_no_show_rate: 5,
}

const party = { title: 'Festa', emoji: '🎉', date: '2025-09-20T22:00:00.000Z' }

export const attendance = [
  { ...party, inscritos: 60, compareceram: 40, nao_foram: 2, withdrew: 3, not_selected: 10, skipped: 0, rodizio: 0, vagas_sociais: 4, staff: 1 },
  { ...party, title: 'Outra', inscritos: 70, compareceram: 50, nao_foram: 1, withdrew: 2, not_selected: 7, skipped: 0, rodizio: 0, vagas_sociais: 5, staff: 1 },
]

export const funnel = [
  { ...party, inscritos: 60, finalizados: 55, pagaram: 45, compareceram: 40, pct_finalizados: 92, pct_pagaram: 75, pct_compareceram: 67 },
]

export const occupancy = [{ ...party, compareceram: 40, total_spots: 50, occupancy_pct: 80 }]

export const timing = [{ ...party, dias_inscricao: 14, dias_pagamento: 9 }]

export const seasonality = [
  { month_name: 'September', avg_inscritos: 60, avg_compareceram: 40, avg_occupancy_pct: 80 },
]

export const revenue = [
  { ...party, faturamento_total: 900000, faturamento_bruto: 950000, ticket_price: 20000, num_pagantes: 45, faturamento_manual: 700000, faturamento_asaas: 200000, pagamentos: 45, pagamentos_cartao: 9 },
  { ...party, title: 'Outra', faturamento_total: 1000000, faturamento_bruto: 1000000, ticket_price: 20000, num_pagantes: 50, faturamento_manual: 500000, faturamento_asaas: 500000, pagamentos: 50, pagamentos_cartao: 10 },
]

export const veteranRookie = [{ ...party, veterans: 30, rookies: 10 }]

export const retention = [
  { events_attended: 1, num_people: 107 },
  { events_attended: 2, num_people: 89 },
]

export const demographics = {
  gender: [{ category: 'Mulher cis', count: 90, percentage: 100 }],
  orientation: [{ category: 'Bissexual', count: 80, percentage: 100 }],
  age: [{ category: '30-34', count: 70, percentage: 100 }],
  race: [{ category: 'Branca', count: 60, percentage: 100 }],
}

export const growth = [{ month: '2025-09', new_profiles: 40, cumulative: 40 }]
