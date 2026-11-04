import type { PageSection } from "~/business/cms/page.schema"
import { homepageCopy } from "~/copy/homepage"
import { formatStatChange, formatStatValue } from "~/lib/helpers/format-stat"
import { cn } from "~/lib/utils"
import { SectionTitle } from "./section-title"

type Content = Extract<PageSection, { _type: "statsSection" }>
type Card = Content["cards"][number]
type CardOf<Type extends Card["_type"]> = Extract<Card, { _type: Type }>

type StatsSectionProps = {
  content: Content
}

export const StatsSection = ({ content }: StatsSectionProps) => {
  return (
    <section className="w-full px-4 py-12 md:px-6 md:py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        {content.title && <SectionTitle>{content.title}</SectionTitle>}
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {content.cards.map((card) => (
            <li
              key={card._key}
              className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm sm:p-6"
            >
              <StatCard card={card} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

const StatCard = ({ card }: { card: Card }) => {
  switch (card._type) {
    case "statNumber":
      return (
        <Headline caption={card.caption}>
          {formatStatValue(card.value, card.unit)}
        </Headline>
      )
    case "statRange":
      return <Range card={card} />
    case "statComparison":
      return <Comparison card={card} />
  }
}

// Values never wrap, so a long one steps down a size. The steps fit the
// narrowest card, two columns on a 640px screen, about 9 characters wide at
// the largest size.
const headlineSize = (value: string) => {
  if (value.length <= 9) return "text-4xl"
  if (value.length <= 12) return "text-3xl"
  if (value.length <= 15) return "text-2xl"
  return "text-xl"
}

// Every card opens the same way, value then caption, and anything else goes
// below: cards in a row stretch to the tallest, so the spare room falls at
// the bottom instead of between a number and what it counts.
const Headline = ({
  label,
  caption,
  children,
}: {
  label?: string
  caption: string
  children: string
}) => (
  <div className="flex flex-col gap-2">
    {label && (
      <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    )}
    <p
      className={cn(
        "whitespace-nowrap font-bold leading-none tracking-tight tabular-nums text-purple",
        headlineSize(children),
      )}
    >
      {children}
    </p>
    <p className="text-muted-foreground">{caption}</p>
  </div>
)

const Range = ({ card }: { card: CardOf<"statRange"> }) => {
  const span = card.max - card.min
  // Studio keeps the average between the two, but the contract does not, so
  // content that slips through still keeps the marker on the track.
  const position =
    span > 0
      ? Math.min(100, Math.max(0, ((card.average - card.min) / span) * 100))
      : 50

  return (
    <>
      <Headline label={homepageCopy.stats.average} caption={card.caption}>
        {formatStatValue(card.average, card.unit)}
      </Headline>
      <div className="flex flex-col gap-2">
        <div aria-hidden className="relative mt-2 h-2 rounded-full bg-muted">
          <div
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-purple shadow"
            style={{ left: `${position}%` }}
          />
        </div>
        <div className="flex justify-between text-sm tabular-nums">
          <RangeEnd
            label={homepageCopy.stats.min}
            value={formatStatValue(card.min, card.unit)}
          />
          <RangeEnd
            label={homepageCopy.stats.max}
            value={formatStatValue(card.max, card.unit)}
            end
          />
        </div>
      </div>
    </>
  )
}

const RangeEnd = ({
  label,
  value,
  end,
}: {
  label: string
  value: string
  end?: boolean
}) => (
  <span className={cn("flex flex-col", end ? "items-end" : "items-start")}>
    <span className="text-muted-foreground">{label}</span>
    <span className="font-bold">{value}</span>
  </span>
)

// The change leads, and two bars show both periods to scale, the earlier one
// in grey. With no change to measure (from zero) the current value leads. A
// bar cannot show a negative value honestly, so then only the numbers remain.
const Comparison = ({ card }: { card: CardOf<"statComparison"> }) => {
  const change = formatStatChange(card.before, card.after, card.unit)
  const largest = Math.max(card.before, card.after) || 1
  const showBars = card.before >= 0 && card.after >= 0

  return (
    <>
      <Headline caption={card.caption}>
        {change ?? formatStatValue(card.after, card.unit)}
      </Headline>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 text-sm">
        <PeriodBar
          label={card.beforeLabel}
          value={formatStatValue(card.before, card.unit)}
          share={showBars ? card.before / largest : null}
        />
        <PeriodBar
          label={card.afterLabel}
          value={formatStatValue(card.after, card.unit)}
          share={showBars ? card.after / largest : null}
          current
        />
      </div>
    </>
  )
}

const PeriodBar = ({
  label,
  value,
  share,
  current,
}: {
  label: string
  value: string
  share: number | null
  current?: boolean
}) => (
  <>
    <span className="text-muted-foreground">{label}</span>
    <div aria-hidden className="h-6">
      {share !== null && (
        // A zero still gets a sliver, so its row reads as a bar, not a gap.
        <div
          className={cn(
            "h-full rounded-md",
            current ? "bg-purple" : "bg-muted-foreground/30",
          )}
          style={{ width: `${Math.max(share * 100, 2)}%` }}
        />
      )}
    </div>
    <span
      className={cn(
        "whitespace-nowrap text-right font-bold tabular-nums",
        current ? "text-purple" : "text-muted-foreground",
      )}
    >
      {value}
    </span>
  </>
)
