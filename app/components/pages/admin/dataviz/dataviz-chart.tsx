import { ChartSection, type ChartContent } from '~/components/pages/page/sections/chart-section'
import { SectionTitle } from '~/components/pages/page/sections/section-title'
import { adminDatavizCopy } from '~/copy/admin/dataviz'

type DatavizChartProps = {
  content: ChartContent
}

// A Page never sends a chart without rows, but the database can have none
// yet, so the title stays and says so instead of drawing empty axes.
export function DatavizChart({ content }: DatavizChartProps) {
  if (content.rows.length > 0) return <ChartSection content={content} />

  return (
    <section className="w-full px-4 py-12 md:px-6 md:py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <SectionTitle>{content.title}</SectionTitle>
        <p className="text-center text-muted-foreground">{adminDatavizCopy.noData}</p>
      </div>
    </section>
  )
}
