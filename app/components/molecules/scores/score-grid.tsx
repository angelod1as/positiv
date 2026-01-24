import { cn } from '~/lib/utils'

type ScoreGridProps = {
  children: React.ReactNode
  className?: string
}

export function ScoreGrid({ children, className }: ScoreGridProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4', className)}>
      {children}
    </div>
  )
}
