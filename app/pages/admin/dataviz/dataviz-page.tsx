import { useCallback, useState } from "react"
import {
  type LoaderFunctionArgs,
  useFetcher,
  useLoaderData,
} from "react-router"
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
import { CommunitySection } from "~/components/pages/admin/dataviz/community-section"
import { EventsSection } from "~/components/pages/admin/dataviz/events-section"
import { KpiScores } from "~/components/pages/admin/dataviz/kpi-scores"
import { adminDatavizCopy } from "~/copy/admin/dataviz"
import paths from "~/lib/paths"

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
      fetcher.load(`${paths.admin.ADMIN_DATAVIZ}?mode=${mode}`)
    },
    [fetcher],
  )

  const totalProfiles = data.kpiScores.total_profiles
  const filledProfilesAge = demographics.age.reduce(
    (sum, item) => sum + item.count,
    0,
  )

  return (
    <div>
      <header className="w-full px-4 pt-12 pb-4 md:px-6 md:pt-16">
        <div className="mx-auto max-w-3xl">
          <h1>{adminDatavizCopy.title}</h1>
        </div>
      </header>

      <KpiScores data={data.kpiScores} />

      <EventsSection
        attendance={data.eventAttendance}
        revenue={data.eventRevenue}
        funnel={data.conversionFunnel}
        occupancy={data.occupancy}
        veteranRookie={data.veteranRookie}
        seasonality={data.seasonality}
      />

      <CommunitySection
        demographics={demographics}
        growth={data.growth}
        retention={data.retention}
        demographicsMode={demographicsMode}
        onModeChange={handleModeChange}
        totalProfiles={totalProfiles}
        filledProfilesAge={filledProfilesAge}
      />
    </div>
  )
}
