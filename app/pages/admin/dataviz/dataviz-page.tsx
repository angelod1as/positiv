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
  getTimingData,
} from "~/business/reporting/dataviz/event-metrics.server"
import {
  getGrowthData,
  getRetentionData,
  getSeasonalityData,
} from "~/business/reporting/dataviz/growth-retention.server"
import { getKpiScores } from "~/business/reporting/dataviz/kpi-scores.server"
import { getPartySummary } from "~/business/reporting/dataviz/party-summary.server"
import type { FilterMode } from "~/components/atoms/charts/demographic-filter-toggle"
import { MoneyChapter } from "~/components/pages/admin/dataviz/money-chapter"
import { OverviewChapter } from "~/components/pages/admin/dataviz/overview-chapter"
import { PartiesChapter } from "~/components/pages/admin/dataviz/parties-chapter"
import { PartyRangeSelector } from "~/components/pages/admin/dataviz/party-range-selector"
import { PeopleChapter } from "~/components/pages/admin/dataviz/people-chapter"
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
    partySummary,
    timing,
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
    getPartySummary(range),
    getTimingData(range),
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
    partySummary,
    timing,
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

      <OverviewChapter summary={data.partySummary} kpis={data.kpiScores} />

      <PartiesChapter
        summary={data.partySummary}
        kpis={data.kpiScores}
        attendance={data.eventAttendance}
        funnel={data.conversionFunnel}
        occupancy={data.occupancy}
        timing={data.timing}
        seasonality={data.seasonality}
      />

      <PeopleChapter
        summary={data.partySummary}
        kpis={data.kpiScores}
        veteranRookie={data.veteranRookie}
        retention={data.retention}
        demographics={demographics}
        growth={data.growth}
        demographicsMode={demographicsMode}
        onModeChange={handleModeChange}
      />

      <MoneyChapter summary={data.partySummary} revenue={data.eventRevenue} />
    </div>
  )
}
