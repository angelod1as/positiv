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
import { ScoreGrid } from '~/components/molecules/scores/score-grid'

type KpiScoresProps = {
  data: KpiScoresData
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
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
        <h2 className="mb-4 text-lg font-semibold">Comunidade</h2>
        <ScoreGrid>
          <ScoreCard
            value={formatNumber(data.total_profiles)}
            label="Total de perfis"
            icon={Users}
          />
          <ScoreCard
            value={formatNumber(data.total_veterans)}
            label="Veterans"
            description={veteranPercentage}
            icon={Shield}
          />
          <ScoreCard
            value={formatNumber(data.total_approved)}
            label="Aprovados"
            description={approvedPercentage}
            icon={CheckCircle}
          />
        </ScoreGrid>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Engajamento</h2>
        <ScoreGrid>
          <ScoreCard
            value={formatNumber(data.total_unique_attendees)}
            label="Participantes únicos"
            icon={UserCheck}
          />
          <ScoreCard
            value={formatNumber(data.avg_attendance_per_event)}
            label="Média de presença"
            description="Por evento"
            icon={BarChart3}
          />
          <ScoreCard
            value={formatNumber(data.attended_3_plus)}
            label="Compareceram 3+ vezes"
            icon={TrendingUp}
          />
          <ScoreCard
            value={formatNumber(data.attended_5_plus)}
            label="Compareceram 5+ vezes"
            icon={Award}
          />
        </ScoreGrid>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Receita</h2>
        <ScoreGrid>
          <ScoreCard
            value={formatCurrency(data.total_revenue)}
            label="Receita total"
            icon={DollarSign}
          />
          <ScoreCard
            value={formatCurrency(data.avg_revenue_per_event)}
            label="Média por evento"
            icon={Receipt}
          />
        </ScoreGrid>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Saúde</h2>
        <ScoreGrid>
          <ScoreCard
            value={`${data.avg_no_show_rate}%`}
            label="Taxa média de no-show"
            icon={AlertCircle}
          />
          <ScoreCard
            value={formatNumber(data.total_flagged)}
            label="Perfis sinalizados"
            description="Amarelo + Vermelho"
            icon={Flag}
          />
        </ScoreGrid>
      </div>
    </div>
  )
}
