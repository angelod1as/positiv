import { Activity, DollarSign, TrendingUp, Users } from 'lucide-react'
import { AreaChart } from '~/components/molecules/charts/area-chart'
import { BarChart } from '~/components/molecules/charts/bar-chart'
import { DonutChart } from '~/components/molecules/charts/donut-chart'
import { LineChart } from '~/components/molecules/charts/line-chart'
import { ScoreCard } from '~/components/molecules/scores/score-card'
import { ScoreGrid } from '~/components/molecules/scores/score-grid'
import { Separator } from '~/components/ui/separator'
import type { ChartConfig } from '~/types/chart.types'

const monthlyData = [
  { month: 'Jan', inscritos: 186, compareceram: 80, novos: 45 },
  { month: 'Fev', inscritos: 305, compareceram: 200, novos: 120 },
  { month: 'Mar', inscritos: 237, compareceram: 120, novos: 90 },
  { month: 'Abr', inscritos: 173, compareceram: 190, novos: 60 },
  { month: 'Mai', inscritos: 209, compareceram: 130, novos: 85 },
  { month: 'Jun', inscritos: 214, compareceram: 140, novos: 95 },
]

const monthlyConfig: ChartConfig = {
  inscritos: { label: 'Inscritos', color: 'var(--chart-1)' },
  compareceram: { label: 'Compareceram', color: 'var(--chart-2)' },
  novos: { label: 'Novos', color: 'var(--chart-3)' },
}

const donutData = [
  { category: 'Homens', count: 275, fill: 'var(--chart-1)' },
  { category: 'Mulheres', count: 200, fill: 'var(--chart-2)' },
  { category: 'Não-binário', count: 87, fill: 'var(--chart-3)' },
  { category: 'Outros', count: 53, fill: 'var(--chart-4)' },
]

const donutConfig: ChartConfig = {
  count: { label: 'Quantidade' },
  Homens: { label: 'Homens', color: 'var(--chart-1)' },
  Mulheres: { label: 'Mulheres', color: 'var(--chart-2)' },
  'Não-binário': { label: 'Não-binário', color: 'var(--chart-3)' },
  Outros: { label: 'Outros', color: 'var(--chart-4)' },
}

const DummyPage = () => {
  return (
    <>
      <h1 className="text-2xl font-bold">Dummy - Visualização de dados</h1>
      <p className="text-muted-foreground">
        Página de referência para testar componentes de visualização de dados.
      </p>

      <Separator />

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">ScoreCard + ScoreGrid</h2>
        <ScoreGrid>
          <ScoreCard
            value={1250}
            label="Total de inscritos"
            trend="up"
            trendValue="+12.5%"
            icon={Users}
            description="Últimos 30 dias"
          />
          <ScoreCard
            value="R$ 8.400"
            label="Receita"
            trend="up"
            trendValue="+8%"
            icon={DollarSign}
          />
          <ScoreCard
            value={340}
            label="Participantes ativos"
            trend="down"
            trendValue="-3.2%"
            icon={Activity}
            description="Comparado ao mês anterior"
          />
          <ScoreCard
            value="92%"
            label="Taxa de presença"
            trend="neutral"
            trendValue="0%"
            icon={TrendingUp}
          />
        </ScoreGrid>

        <h3 className="text-lg font-medium mt-4">ScoreCard sem ícone e sem trend</h3>
        <ScoreGrid>
          <ScoreCard value={42} label="Eventos realizados" />
          <ScoreCard value="3h 20min" label="Duração média" description="Por evento" />
        </ScoreGrid>
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">AreaChart</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">Stacked (padrão)</h3>
            <AreaChart
              data={monthlyData}
              config={monthlyConfig}
              series={[{ dataKey: 'inscritos' }, { dataKey: 'compareceram' }]}
              xAxisKey="month"
              ariaLabel="Area chart stacked"
            />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">Não-stacked, 3 séries</h3>
            <AreaChart
              data={monthlyData}
              config={monthlyConfig}
              series={[{ dataKey: 'inscritos' }, { dataKey: 'compareceram' }, { dataKey: 'novos' }]}
              xAxisKey="month"
              stacked={false}
              ariaLabel="Area chart non-stacked"
            />
          </div>
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">BarChart</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">Vertical (padrão)</h3>
            <BarChart
              data={monthlyData}
              config={monthlyConfig}
              series={[{ dataKey: 'inscritos' }, { dataKey: 'compareceram' }]}
              xAxisKey="month"
              ariaLabel="Bar chart vertical"
            />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">Horizontal</h3>
            <BarChart
              data={monthlyData}
              config={monthlyConfig}
              series={[{ dataKey: 'inscritos' }]}
              xAxisKey="month"
              horizontal
              ariaLabel="Bar chart horizontal"
            />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">Stacked</h3>
            <BarChart
              data={monthlyData}
              config={monthlyConfig}
              series={[{ dataKey: 'inscritos' }, { dataKey: 'compareceram' }, { dataKey: 'novos' }]}
              xAxisKey="month"
              stacked
              ariaLabel="Bar chart stacked"
            />
          </div>
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">LineChart</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">Curved (padrão)</h3>
            <LineChart
              data={monthlyData}
              config={monthlyConfig}
              series={[{ dataKey: 'inscritos' }, { dataKey: 'compareceram' }]}
              xAxisKey="month"
              ariaLabel="Line chart curved"
            />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">Linear (sem curva)</h3>
            <LineChart
              data={monthlyData}
              config={monthlyConfig}
              series={[{ dataKey: 'inscritos' }, { dataKey: 'novos' }]}
              xAxisKey="month"
              curved={false}
              ariaLabel="Line chart linear"
            />
          </div>
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">DonutChart</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">Padrão</h3>
            <DonutChart
              data={donutData}
              config={donutConfig}
              dataKey="count"
              nameKey="category"
              ariaLabel="Donut chart default"
            />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">Com label central</h3>
            <DonutChart
              data={donutData}
              config={donutConfig}
              dataKey="count"
              nameKey="category"
              centerLabel={<span className="text-2xl font-bold">615</span>}
              ariaLabel="Donut chart with center label"
            />
          </div>
        </div>
      </section>
    </>
  )
}

export default DummyPage
