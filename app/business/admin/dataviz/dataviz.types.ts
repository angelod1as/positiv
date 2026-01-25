export type EventAttendanceDataPoint = {
  title: string
  emoji: string
  date: string
  inscritos: number
  compareceram: number
  nao_foram: number
  will_not_go: number
  skipped: number
  rodizio: number
  vagas_sociais: number
  staff: number
}

export type EventRevenueDataPoint = {
  title: string
  emoji: string
  date: string
  faturamento_total: number
  ticket_price: number
  num_pagantes: number
}

export type ConversionFunnelDataPoint = {
  title: string
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
  total_events_completed: number
  total_unique_attendees: number
  avg_attendance_per_event: number
  avg_occupancy_pct: number
  total_revenue: number
  avg_revenue_per_event: number
  avg_ticket_price: number
}
