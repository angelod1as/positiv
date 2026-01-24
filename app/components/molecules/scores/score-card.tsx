import type { LucideIcon } from 'lucide-react'

type ScoreCardProps = {
  value: string | number
  label: string
  description?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  icon?: LucideIcon
  className?: string
}

export function ScoreCard(_props: ScoreCardProps) {
  return <div />
}
