import { getKpiScores } from "~/business/admin/dataviz/kpi-scores.server"
import { KpiScores } from "~/components/pages/admin/dataviz/kpi-scores"
import { createMetaArray } from "~/lib/helpers/meta"
import type { Route } from "./+types/dataviz-example"

export function meta({}: Route.MetaArgs) {
  return createMetaArray("Admin - KPI Dashboard")
}

export async function loader() {
  const kpiData = await getKpiScores()
  return { kpiData }
}

export default function DatavizExample({ loaderData }: Route.ComponentProps) {
  return (
    <div className="space-y-8">
      <h1>KPI Dashboard</h1>
      <KpiScores data={loaderData.kpiData} />
    </div>
  )
}
