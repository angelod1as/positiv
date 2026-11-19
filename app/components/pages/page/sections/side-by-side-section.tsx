import type { PageSection } from "~/business/cms/page.schema"
import { cn } from "~/lib/utils"
import { Callout } from "./callout-section"
import { SectionTitle } from "./section-title"

type Content = Extract<PageSection, { _type: "sideBySide" }>

// Every item shares one row on a wide screen, two per row in between and one
// on a phone. Listed whole so Tailwind finds every class.
const WIDE_COLUMNS: Record<number, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
}

type SideBySideSectionProps = {
  content: Content
}

export const SideBySideSection = ({ content }: SideBySideSectionProps) => (
  <section className="w-full px-4 py-8 md:px-6">
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      {content.title && <SectionTitle>{content.title}</SectionTitle>}
      <ul
        className={cn(
          "grid grid-cols-1 gap-4 sm:grid-cols-2",
          WIDE_COLUMNS[content.items.length],
        )}
      >
        {content.items.map((item) => (
          <li key={item._key} className="min-w-0">
            <Callout content={item} headingLevel={content.title ? 3 : 2} />
          </li>
        ))}
      </ul>
    </div>
  </section>
)
