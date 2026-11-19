import type { PageSection } from "~/business/cms/page.schema"
import { LongRichText } from "~/components/atoms/rich-text/rich-text"
import { cn } from "~/lib/utils"

type Content = Extract<PageSection, { _type: "callout" }>

// Listed whole so Tailwind finds every class. The tint stays light, so the
// text stays dark and readable on yellow and lightgreen too.
const COLORS: Record<Content["color"], string> = {
  purple: "border-purple bg-purple/10",
  blue: "border-blue bg-blue/10",
  green: "border-green bg-green/10",
  lightgreen: "border-lightgreen bg-lightgreen/10",
  yellow: "border-yellow bg-yellow/10",
  red: "border-red bg-red/10",
  neutral: "border-border bg-muted/40",
}

type CalloutProps = {
  content: Content
  headingLevel?: 2 | 3
}

const Emoji = ({ emoji }: { emoji: string }) => (
  <span aria-hidden className="shrink-0">
    {emoji}
  </span>
)

export const Callout = ({ content, headingLevel = 2 }: CalloutProps) => {
  const Heading = headingLevel === 2 ? "h2" : "h3"
  const body = (
    <div className="flex min-w-0 flex-col gap-2">
      <LongRichText value={content.body} />
    </div>
  )

  return (
    <div
      role="note"
      className={cn(
        "flex h-full flex-col gap-2 rounded-xl border-2 p-5",
        COLORS[content.color],
      )}
    >
      {content.title ? (
        <>
          <Heading className="flex gap-2 text-lg font-bold leading-snug">
            {content.emoji && <Emoji emoji={content.emoji} />}
            {content.title}
          </Heading>
          {body}
        </>
      ) : content.emoji ? (
        <div className="flex gap-2">
          <Emoji emoji={content.emoji} />
          {body}
        </div>
      ) : (
        body
      )}
    </div>
  )
}

export const CalloutSection = ({ content, headingLevel }: CalloutProps) => (
  <section className="w-full px-4 py-8 md:px-6">
    <div className="mx-auto max-w-3xl">
      <Callout content={content} headingLevel={headingLevel} />
    </div>
  </section>
)
