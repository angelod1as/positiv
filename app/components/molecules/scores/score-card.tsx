import type { LucideIcon } from 'lucide-react'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '~/components/ui/card'
import { cn } from '~/lib/utils'

type ScoreCardProps = {
  value: string | number
  label: string
  description?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  icon?: LucideIcon
  className?: string
}

const trendConfig = {
  up: { icon: TrendingUp, className: 'text-green-600' },
  down: { icon: TrendingDown, className: 'text-red-600' },
  neutral: { icon: Minus, className: 'text-muted-foreground' },
}

export function ScoreCard({
  value,
  label,
  description,
  trend,
  trendValue,
  icon: Icon,
  className,
}: ScoreCardProps) {
  const trendInfo = trend ? trendConfig[trend] : null

  return (
    <Card className={cn(className)}>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          {Icon && (
            <span data-slot="icon">
              <Icon className="size-4 text-muted-foreground" />
            </span>
          )}
        </div>
        <span className="font-dm text-3xl font-bold">{value}</span>
        {trendInfo && (
          <div data-slot="trend" className={cn('flex items-center gap-1 text-sm', trendInfo.className)}>
            <trendInfo.icon className="size-4" />
            <span>{trendValue}</span>
          </div>
        )}
        {description && (
          <span data-slot="description" className="text-sm text-muted-foreground">
            {description}
          </span>
        )}
      </CardContent>
    </Card>
  )
}
