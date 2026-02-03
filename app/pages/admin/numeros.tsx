import type { Route } from "./+types/numeros"
import { getKpiScores } from "~/business/admin/dataviz/kpi-scores.server"
import {
  getEventAttendanceData,
  getEventRevenueData,
  getConversionFunnelData,
  getOccupancyData,
} from "~/business/admin/dataviz/event-metrics.server"
import {
  getVeteranRookieData,
  getDemographicsData,
} from "~/business/admin/dataviz/demographics-dataviz.server"
import {
  getGrowthData,
  getRetentionData,
  getSeasonalityData,
} from "~/business/admin/dataviz/growth-retention.server"

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
  return (
    <div>
      <h1>Números</h1>
    </div>
  )
}
