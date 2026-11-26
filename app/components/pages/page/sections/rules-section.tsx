import type { PageSection } from "~/business/cms/page.schema"
import type { RulesPartContent } from "~/business/cms/rules.schema"
import { RulesPart } from "~/components/organisms/rules/rules-part"

type RulesSectionProps = {
  content: Extract<PageSection, { _type: "rulesSection" }>
  privateRules: RulesPartContent | null
}

export const RulesSection = ({ content, privateRules }: RulesSectionProps) => {
  const part = content.part === "privateRules" ? privateRules : content

  if (!part?.rules?.length) return null

  return (
    <section className="w-full px-4 py-8 md:px-6">
      <div className="mx-auto max-w-3xl">
        <RulesPart
          title={part.title}
          subtitle={part.subtitle}
          rules={part.rules}
        />
      </div>
    </section>
  )
}
