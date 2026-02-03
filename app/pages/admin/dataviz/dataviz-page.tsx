import { useState } from "react"
import { useLoaderData } from "react-router"
import {
  getDemographicsData,
  getVeteranRookieData,
} from "~/business/admin/dataviz/demographics-dataviz.server"
import {
  getConversionFunnelData,
  getEventAttendanceData,
  getEventRevenueData,
  getOccupancyData,
} from "~/business/admin/dataviz/event-metrics.server"
import {
  getGrowthData,
  getRetentionData,
  getSeasonalityData,
} from "~/business/admin/dataviz/growth-retention.server"
import { getKpiScores } from "~/business/admin/dataviz/kpi-scores.server"
import { AgeChart } from "~/components/pages/admin/dataviz/age-chart"
import { AttendanceChart } from "~/components/pages/admin/dataviz/attendance-chart"
import { FunnelChart } from "~/components/pages/admin/dataviz/funnel-chart"
import {
  GenderChart,
  type FilterMode,
} from "~/components/pages/admin/dataviz/gender-chart"
import { GrowthChart } from "~/components/pages/admin/dataviz/growth-chart"
import { KpiScores } from "~/components/pages/admin/dataviz/kpi-scores"
import { OccupancyChart } from "~/components/pages/admin/dataviz/occupancy-chart"
import { OrientationChart } from "~/components/pages/admin/dataviz/orientation-chart"
import { RaceChart } from "~/components/pages/admin/dataviz/race-chart"
import { RetentionChart } from "~/components/pages/admin/dataviz/retention-chart"
import { RevenueChart } from "~/components/pages/admin/dataviz/revenue-chart"
import { SeasonalityChart } from "~/components/pages/admin/dataviz/seasonality-chart"
import { VeteranRookieChart } from "~/components/pages/admin/dataviz/veteran-rookie-chart"
import { Separator } from "~/components/ui/separator"

export async function loader() {
  const [
    kpiScores,
    eventAttendance,
    eventRevenue,
    conversionFunnel,
    occupancy,
    veteranRookie,
    demographics,
    growth,
    retention,
    seasonality,
  ] = await Promise.all([
    getKpiScores(),
    getEventAttendanceData(),
    getEventRevenueData(),
    getConversionFunnelData(),
    getOccupancyData(),
    getVeteranRookieData(),
    getDemographicsData("all"),
    getGrowthData(),
    getRetentionData(),
    getSeasonalityData(),
  ])

  return {
    kpiScores,
    eventAttendance,
    eventRevenue,
    conversionFunnel,
    occupancy,
    veteranRookie,
    demographics,
    growth,
    retention,
    seasonality,
  }
}

export default function NumerosPage() {
  const data = useLoaderData<typeof loader>()
  const [demographicsMode, setDemographicsMode] = useState<FilterMode>("all")

  const totalProfiles = data.kpiScores.total_profiles
  const filledProfilesAge = data.demographics.age.reduce(
    (sum, item) => sum + item.count,
    0,
  )

  return (
    <div className="space-y-12">
      <h1 className="text-3xl font-bold">Números</h1>

      {/* KPIs Section */}
      <section>
        <KpiScores data={data.kpiScores} />
      </section>

      <Separator />

      {/* Eventos Section */}
      <section className="space-y-8">
        <h2 className="text-2xl font-semibold">Eventos</h2>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <AttendanceChart data={data.eventAttendance} />
          <RevenueChart data={data.eventRevenue} />
        </div>
        <FunnelChart data={data.conversionFunnel} />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <VeteranRookieChart data={data.veteranRookie} />
          <OccupancyChart data={data.occupancy} />
        </div>
      </section>

      <Separator />

      {/* Comunidade Section */}
      <section className="space-y-8">
        <h2 className="text-2xl font-semibold">Comunidade</h2>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <GenderChart
            data={data.demographics.gender}
            mode={demographicsMode}
            onModeChange={setDemographicsMode}
          />
          <OrientationChart
            data={data.demographics.orientation}
            mode={demographicsMode}
            onModeChange={setDemographicsMode}
          />
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <AgeChart
            data={data.demographics.age}
            mode={demographicsMode}
            onModeChange={setDemographicsMode}
            totalProfiles={totalProfiles}
            filledProfiles={filledProfilesAge}
          />
          <RaceChart
            data={data.demographics.race}
            mode={demographicsMode}
            onModeChange={setDemographicsMode}
          />
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <GrowthChart data={data.growth} />
          <RetentionChart data={data.retention} />
        </div>
      </section>

      <Separator />

      {/* Sazonalidade Section */}
      <section className="space-y-8">
        <h2 className="text-2xl font-semibold">Sazonalidade</h2>
        <SeasonalityChart data={data.eventAttendance} />
      </section>
    </div>
  )
}
