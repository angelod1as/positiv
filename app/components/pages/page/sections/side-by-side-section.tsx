import type { PageSection } from "~/business/cms/page.schema"
import { cn } from "~/lib/utils"
import { Callout } from "./callout-section"
import { SectionTitle } from "./section-title"

type Content = Extract<PageSection, { _type: "sideBySide" }>

// Every item shares one row on a wide screen, two per row in between and one
// on a phone. In between, each item spans two of four columns, so an odd one
// out starts one column in and sits centred. Listed whole so Tailwind finds
// every class.
const WIDE_COLUMNS: Record<number, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
}

const isLeftover = (index: number, count: number) =>
  count % 2 === 1 && index === count - 1

type SideBySideSectionProps = {
  content: Content
}

export const SideBySideSection = ({ content }: SideBySideSectionProps) => (
  <section className="w-full px-4 py-8 md:px-6">
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      {content.title && <SectionTitle>{content.title}</SectionTitle>}
      <ul
        className={cn(
          "grid grid-cols-1 gap-4 sm:grid-cols-4",
          WIDE_COLUMNS[content.items.length],
        )}
      >
        {content.items.map((item, index) => (
          <li
            key={item._key}
            className={cn(
              "min-w-0 sm:col-span-2 lg:col-span-1",
              isLeftover(index, content.items.length) &&
                "sm:max-lg:col-start-2",
            )}
          >
            <Callout content={item} headingLevel={content.title ? 3 : 2} />
          </li>
        ))}
      </ul>
    </div>
  </section>
)
