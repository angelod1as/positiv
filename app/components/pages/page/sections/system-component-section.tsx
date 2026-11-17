import type { PageSection } from "~/business/cms/page.schema"
import { AnalyticsOptOut } from "~/components/molecules/analytics-opt-out/analytics-opt-out"

type SystemComponentSectionProps = {
  content: Extract<PageSection, { _type: "systemComponent" }>
}

const components = {
  analyticsOptOut: AnalyticsOptOut,
} satisfies Record<SystemComponentSectionProps["content"]["component"], unknown>

export const SystemComponentSection = ({
  content,
}: SystemComponentSectionProps) => {
  const Component = components[content.component]

  return (
    <section className="w-full px-4 py-8 md:px-6">
      <div className="mx-auto max-w-3xl">
        <Component />
      </div>
    </section>
  )
}
