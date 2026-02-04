import type {
  ConversionFunnelDataPoint,
  EventAttendanceDataPoint,
  EventRevenueDataPoint,
  OccupancyDataPoint,
} from '~/business/admin/dataviz/dataviz.types'
import { ChartSection } from '~/components/atoms/charts/chart-section'
import { AttendanceChart } from './attendance-chart'
import { FunnelChart } from './funnel-chart'
import { OccupancyChart } from './occupancy-chart'
import { RevenueChart } from './revenue-chart'

interface EventsSectionProps {
  attendance: EventAttendanceDataPoint[]
  revenue: EventRevenueDataPoint[]
  funnel: ConversionFunnelDataPoint[]
  occupancy: OccupancyDataPoint[]
}

export function EventsSection({
  attendance,
  revenue,
  funnel,
  occupancy,
}: EventsSectionProps) {
  return (
    <section className="space-y-8">
      <h2 className="text-2xl font-semibold">Eventos</h2>
      <ChartSection
        title="Presença por Evento"
        description="Evolução do número de inscritos, comparecimentos e faltas ao longo dos eventos."
      >
        <AttendanceChart data={attendance} />
      </ChartSection>
      <ChartSection
        title="Faturamento por Evento"
        description="Receita total e preço do ingresso por evento, com evolução ao longo do tempo."
      >
        <RevenueChart data={revenue} />
      </ChartSection>
      <ChartSection
        title="Funil de Conversão"
        description="Proporção de inscritos que finalizaram cadastro, pagaram e compareceram."
      >
        <FunnelChart data={funnel} />
      </ChartSection>
      <ChartSection
        title="Ocupação"
        description="Percentual de ocupação das vagas em cada evento."
      >
        <OccupancyChart data={occupancy} />
      </ChartSection>
    </section>
  )
}
