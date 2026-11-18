export type EventAttendanceDataPoint = {
  title: string
  emoji: string
  date: string
  inscritos: number
  compareceram: number
  nao_foram: number
  withdrew: number
  not_selected: number
  skipped: number
  rodizio: number
  vagas_sociais: number
  staff: number
}

export type EventRevenueDataPoint = {
  title: string
  emoji: string
  date: string
  /** What the participants paid, refunds deducted, in cents. */
  faturamento_total: number
  /** What the participants paid, in cents. */
  faturamento_bruto: number
  ticket_price: number
  num_pagantes: number
  /** Net of refunds, in cents, taken by hand by an admin. */
  faturamento_manual: number
  /** Net of refunds, in cents, taken through Asaas. */
  faturamento_asaas: number
  /** Payments that went through and were not wholly refunded. */
  pagamentos: number
  pagamentos_cartao: number
}

export type ConversionFunnelDataPoint = {
  title: string
  emoji: string
  date: string
  inscritos: number
  finalizados: number
  pagaram: number
  compareceram: number
  pct_finalizados: number
  pct_pagaram: number
  pct_compareceram: number
}

export type OccupancyDataPoint = {
  title: string
  emoji: string
  date: string
  compareceram: number
  total_spots: number
  occupancy_pct: number
}

export type VeteranRookieDataPoint = {
  title: string
  emoji: string
  date: string
  veterans: number
  rookies: number
}

export type DemographicDistribution = {
  category: string
  count: number
  percentage: number
}

export type DemographicsDataResult = {
  gender: DemographicDistribution[]
  orientation: DemographicDistribution[]
  age: DemographicDistribution[]
  race: DemographicDistribution[]
}

export type GrowthDataPoint = {
  month: string
  new_profiles: number
  cumulative: number
}

export type RetentionDataPoint = {
  events_attended: number
  num_people: number
}

export type SeasonalityDataPoint = {
  month_name: string
  avg_inscritos: number
  avg_compareceram: number
  avg_occupancy_pct: number
}

export type KpiScores = {
  total_profiles: number
  total_veterans: number
  total_approved: number
  total_events_completed: number
  total_unique_attendees: number
  avg_attendance_per_event: number
  avg_occupancy_pct: number
  total_revenue: number
  avg_revenue_per_event: number
  avg_ticket_price: number
  total_flagged: number
  attended_3_plus: number
  attended_5_plus: number
  avg_no_show_rate: number
}

/** The annual report's numbers for the parties in a range. */
export type PartySummary = {
  parties: number
  people: number
  attendances: number
  /** Staff are placed, not applying: left out of the demand numbers. */
  applications: number
  /** Share of the people who applied that got into a party, 1 decimal. */
  acceptance_rate: number
  avg_people_per_party: number
  max_people_per_party: number
  /** People whose first party ever falls in the range. */
  newcomers: number
  /** Newcomers who came back to a later party, in the range or after it. */
  newcomers_returned: number
  /** People at two or more parties in the range. */
  repeat_people: number
  /** Age at the person's first party in the range, kept to 18-120. */
  age: { min: number; avg: number; max: number } | null
  social_spots: number
}

export type TimingDataPoint = {
  title: string
  emoji: string
  date: string
  /** Median days between applying and the party. */
  dias_inscricao: number | null
  /** Median days between the first payment and the party. */
  dias_pagamento: number | null
}
