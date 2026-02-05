import type { ReactNode } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { cn } from '~/lib/utils'

interface ChartSectionProps {
  title: string
  description: string
  children: ReactNode
  className?: string
}

export function ChartSection({
  title,
  description,
  children,
  className,
}: ChartSectionProps) {
  return (
    <Card className={cn('py-4', className)}>
      <CardHeader>
        <CardTitle>
          <h3 className="text-lg font-semibold">{title}</h3>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
