import {
  AlertCircle,
  Award,
  BarChart3,
  CheckCircle,
  DollarSign,
  Flag,
  Receipt,
  Shield,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import type { KpiScores as KpiScoresData } from '~/business/admin/dataviz/dataviz.types'
import { ScoreCard } from '~/components/molecules/scores/score-card'
import { adminDatavizCopy } from '~/copy/admin/dataviz'
import { ScoreGrid } from '~/components/molecules/scores/score-grid'
import { formatCurrency } from '~/lib/helpers/format-currency'

const kpiCopy = adminDatavizCopy.kpiScores

type KpiScoresProps = {
  data: KpiScoresData
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

function calculatePercentage(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

export function KpiScores({ data }: KpiScoresProps) {
  const veteranPercentage = calculatePercentage(data.total_veterans, data.total_profiles)
  const approvedPercentage = calculatePercentage(data.total_approved, data.total_profiles)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-4 text-lg font-semibold">{kpiCopy.community.title}</h2>
        <ScoreGrid>
          <ScoreCard
            value={formatNumber(data.total_profiles)}
            label={kpiCopy.community.totalProfiles}
            icon={Users}
          />
          <ScoreCard
            value={formatNumber(data.total_veterans)}
            label={kpiCopy.community.veterans}
            description={veteranPercentage}
            icon={Shield}
          />
          <ScoreCard
            value={formatNumber(data.total_approved)}
            label={kpiCopy.community.approved}
            description={approvedPercentage}
            icon={CheckCircle}
          />
        </ScoreGrid>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">{kpiCopy.engagement.title}</h2>
        <ScoreGrid>
          <ScoreCard
            value={formatNumber(data.total_unique_attendees)}
            label={kpiCopy.engagement.uniqueAttendees}
            icon={UserCheck}
          />
          <ScoreCard
            value={formatNumber(data.avg_attendance_per_event)}
            label={kpiCopy.engagement.averageAttendance}
            description={kpiCopy.engagement.averageAttendanceDescription}
            icon={BarChart3}
          />
          <ScoreCard
            value={formatNumber(data.attended_3_plus)}
            label={kpiCopy.engagement.attendedThreePlus}
            icon={TrendingUp}
          />
          <ScoreCard
            value={formatNumber(data.attended_5_plus)}
            label={kpiCopy.engagement.attendedFivePlus}
            icon={Award}
          />
        </ScoreGrid>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">{kpiCopy.revenue.title}</h2>
        <ScoreGrid>
          <ScoreCard
            value={formatCurrency(data.total_revenue)}
            label={kpiCopy.revenue.total}
            icon={DollarSign}
          />
          <ScoreCard
            value={formatCurrency(data.avg_revenue_per_event)}
            label={kpiCopy.revenue.averagePerEvent}
            icon={Receipt}
          />
        </ScoreGrid>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">{kpiCopy.health.title}</h2>
        <ScoreGrid>
          <ScoreCard
            value={`${data.avg_no_show_rate}%`}
            label={kpiCopy.health.noShowRate}
            icon={AlertCircle}
          />
          <ScoreCard
            value={formatNumber(data.total_flagged)}
            label={kpiCopy.health.flagged}
            description={kpiCopy.health.flaggedDescription}
            icon={Flag}
          />
        </ScoreGrid>
      </div>
    </div>
  )
}
