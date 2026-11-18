import {
  type LoaderFunctionArgs,
  useLoaderData,
  useSearchParams,
} from "react-router"
import {
  type DatavizRange,
  datavizRange,
  fullDatavizRange,
} from "~/business/reporting/dataviz/dataviz-range"
import {
  getDemographicsData,
  getVeteranRookieData,
} from "~/business/reporting/dataviz/demographics-dataviz.server"
import {
  getConversionFunnelData,
  getEventAttendanceData,
  getEventRevenueData,
  getOccupancyData,
} from "~/business/reporting/dataviz/event-metrics.server"
import {
  getGrowthData,
  getRetentionData,
  getSeasonalityData,
} from "~/business/reporting/dataviz/growth-retention.server"
import { getKpiScores } from "~/business/reporting/dataviz/kpi-scores.server"
import type { FilterMode } from "~/components/atoms/charts/demographic-filter-toggle"
import { CommunitySection } from "~/components/pages/admin/dataviz/community-section"
import { EventsSection } from "~/components/pages/admin/dataviz/events-section"
import { KpiScores } from "~/components/pages/admin/dataviz/kpi-scores"
import { PartyRangeSelector } from "~/components/pages/admin/dataviz/party-range-selector"
import { adminDatavizCopy } from "~/copy/admin/dataviz"

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const modeParam = url.searchParams.get("mode")
  const demographicsMode: "all" | "attended" =
    modeParam === "attended" ? "attended" : "all"
  const range = datavizRange(url.searchParams)
  const [
    parties,
    kpiScores,
    eventRevenue,
    conversionFunnel,
    occupancy,
    veteranRookie,
    demographics,
    growth,
    retention,
    seasonality,
  ] = await Promise.all([
    getEventAttendanceData(fullDatavizRange()),
    getKpiScores(range),
    getEventRevenueData(range),
    getConversionFunnelData(range),
    getOccupancyData(range),
    getVeteranRookieData(range),
    getDemographicsData(demographicsMode, range),
    getGrowthData(range),
    getRetentionData(range),
    getSeasonalityData(range),
  ])
  const eventAttendance = parties.filter(
    (party) => party.date >= range.from && party.date <= range.to
  )

  return {
    range,
    parties,
    demographicsMode,
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
  const [, setSearchParams] = useSearchParams()
  const { demographics, demographicsMode } = data

  const updateSearch = (values: Record<string, string>) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(values)) next.set(key, value)
        return next
      },
      { replace: true, preventScrollReset: true }
    )

  const handleRangeChange = (range: DatavizRange) => updateSearch(range)
  const handleModeChange = (mode: FilterMode) => updateSearch({ mode })

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
          <PartyRangeSelector
            parties={data.parties}
            range={data.range}
            onRangeChange={handleRangeChange}
          />
        </div>
      </header>

      <KpiScores data={data.kpiScores} attendance={data.eventAttendance} />

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
