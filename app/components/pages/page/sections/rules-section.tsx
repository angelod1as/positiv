import type { PageSection } from "~/business/cms/page.schema"
import type { Rule } from "~/business/cms/rules.schema"
import { RulesPart } from "~/components/organisms/rules/rules-part"

type RulesSectionProps = {
  content: Extract<PageSection, { _type: "rulesSection" }>
  privateRules: Rule[] | null
}

export const RulesSection = ({ content, privateRules }: RulesSectionProps) => {
  const rules =
    content.part === "privateRules" ? privateRules : content.rules

  if (!rules?.length) return null

  return (
    <section className="w-full px-4 py-8 md:px-6">
      <div className="mx-auto max-w-3xl">
        <RulesPart
          title={content.title}
          subtitle={content.subtitle}
          rules={rules}
        />
      </div>
    </section>
  )
}
