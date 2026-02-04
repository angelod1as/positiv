import { useCallback, useState } from "react"
import { type LoaderFunctionArgs, useFetcher, useLoaderData } from "react-router"
import type { DemographicsDataResult } from "~/business/admin/dataviz/dataviz.types"
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
import type { FilterMode } from "~/components/atoms/charts/demographic-filter-toggle"
import { AgeChart } from "~/components/pages/admin/dataviz/age-chart"
import { AttendanceChart } from "~/components/pages/admin/dataviz/attendance-chart"
import { FunnelChart } from "~/components/pages/admin/dataviz/funnel-chart"
import { GenderChart } from "~/components/pages/admin/dataviz/gender-chart"
import { GrowthChart } from "~/components/pages/admin/dataviz/growth-chart"
import { KpiScores } from "~/components/pages/admin/dataviz/kpi-scores"
import { OccupancyChart } from "~/components/pages/admin/dataviz/occupancy-chart"
import { OrientationChart } from "~/components/pages/admin/dataviz/orientation-chart"
import { RaceChart } from "~/components/pages/admin/dataviz/race-chart"
import { RetentionChart } from "~/components/pages/admin/dataviz/retention-chart"
import { RevenueChart } from "~/components/pages/admin/dataviz/revenue-chart"
import { Separator } from "~/components/ui/separator"

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const modeParam = url.searchParams.get("mode")
  const demographicsMode: "all" | "attended" =
    modeParam === "attended" ? "attended" : "all"
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
    getDemographicsData(demographicsMode),
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
  const fetcher = useFetcher<typeof loader>()

  const demographics: DemographicsDataResult =
    fetcher.data?.demographics ?? data.demographics

  const handleModeChange = useCallback(
    (mode: FilterMode) => {
      setDemographicsMode(mode)
      fetcher.load(`/admin/numeros?mode=${mode}`)
    },
    [fetcher],
  )

  const totalProfiles = data.kpiScores.total_profiles
  const filledProfilesAge = demographics.age.reduce(
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
        <AttendanceChart data={data.eventAttendance} />
        <RevenueChart data={data.eventRevenue} />
        <FunnelChart data={data.conversionFunnel} />
        {/* <VeteranRookieChart data={data.veteranRookie} /> */}
        <OccupancyChart data={data.occupancy} />
      </section>

      <Separator />

      {/* Comunidade Section */}
      <section className="space-y-8">
        <h2 className="text-2xl font-semibold">Comunidade</h2>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <GenderChart
            data={demographics.gender}
            mode={demographicsMode}
            onModeChange={handleModeChange}
          />
          <OrientationChart
            data={demographics.orientation}
            mode={demographicsMode}
            onModeChange={handleModeChange}
          />
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <AgeChart
            data={demographics.age}
            mode={demographicsMode}
            onModeChange={handleModeChange}
            totalProfiles={totalProfiles}
            filledProfiles={filledProfilesAge}
          />
          <RaceChart
            data={demographics.race}
            mode={demographicsMode}
            onModeChange={handleModeChange}
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
        {/* <SeasonalityChart data={data.eventAttendance} /> */}
      </section>
    </div>
  )
}
