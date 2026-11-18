import type { EventRevenueDataPoint, PartySummary } from '~/business/reporting/dataviz/dataviz.types'
import { StatsSection } from '~/components/pages/page/sections/stats-section'
import { adminDatavizCopy } from '~/copy/admin/dataviz'
import { DatavizChart } from './dataviz-chart'
import { revenueChart, ticketChart } from './dataviz-charts'
import { DatavizHeading } from './dataviz-heading'
import { internalChart, oneDecimal, percentOf, stat, statsGroup } from './stat-cards'

const copy = adminDatavizCopy.chapters.money

type MoneyChapterProps = {
  summary: PartySummary
  revenue: EventRevenueDataPoint[]
}

const sum = (rows: EventRevenueDataPoint[], key: keyof EventRevenueDataPoint) =>
  rows.reduce((total, row) => total + Number(row[key]), 0)

const reais = (cents: number) => Math.round(cents) / 100

export function MoneyChapter({ summary, revenue }: MoneyChapterProps) {
  const social = statsGroup('social', copy.socialTitle, [
    stat('social', summary.social_spots, copy.social),
    stat(
      'social-per-party',
      summary.parties === 0 ? 0 : oneDecimal(summary.social_spots / summary.parties),
      copy.socialPerParty,
    ),
    stat('social-share', percentOf(summary.social_spots, summary.attendances), copy.socialShare, 'percent'),
  ])

  const net = sum(revenue, 'faturamento_total')
  const gross = sum(revenue, 'faturamento_bruto')
  const payers = sum(revenue, 'num_pagantes')
  const money = statsGroup('revenue', adminDatavizCopy.internal(copy.revenueTitle), [
    stat('net', reais(net), copy.net, 'brl'),
    stat('gross', reais(gross), copy.gross, 'brl'),
    stat('per-party', revenue.length === 0 ? 0 : reais(net / revenue.length), copy.perParty, 'brl'),
    stat('refunds', reais(gross - net), copy.refunds, 'brl'),
    stat('average-ticket', payers === 0 ? 0 : reais(net / payers), copy.averageTicket, 'brl'),
    stat(
      'card-share',
      percentOf(sum(revenue, 'pagamentos_cartao'), sum(revenue, 'pagamentos')),
      copy.cardShare,
      'percent',
    ),
  ])
  const charts = [revenueChart(revenue), ticketChart(revenue)].map(internalChart)

  return (
    <div>
      <DatavizHeading title={copy.title} />
      <StatsSection content={social} />
      <StatsSection content={money} />
      {charts.map((content) => (
        <DatavizChart key={content._key} content={content} />
      ))}
    </div>
  )
}
