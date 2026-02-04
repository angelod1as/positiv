import type { ReactNode } from 'react'
import { cn } from '~/lib/utils'

interface ScrollableChartContainerProps {
  minWidth: number
  children: ReactNode
  className?: string
}

export function ScrollableChartContainer({
  minWidth,
  children,
  className,
}: ScrollableChartContainerProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <div style={{ minWidth }}>{children}</div>
    </div>
  )
}
