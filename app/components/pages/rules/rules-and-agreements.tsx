import type { Rule, Rules } from "~/business/cms/rules.schema"
import { RulesPart } from "~/components/organisms/rules/rules-part"
import { Alert, AlertDescription } from "~/components/ui/alert"
import { rulesPageCopy } from "~/copy/dashboard"
import { rulesCopy } from "~/copy/events"

type RulesAndAgreementsProps = { rules: Rules | null }

const Section = ({ heading, rules }: { heading: string; rules: Rule[] }) =>
  rules.length > 0 && (
    <section className="flex flex-col gap-8">
      <h2>{heading}</h2>
      <RulesPart rules={rules} />
    </section>
  )

export const RulesAndAgreements = ({ rules }: RulesAndAgreementsProps) => (
  <>
    <h1>{rulesPageCopy.title}</h1>

    {rules ? (
      <>
        <Section
          heading={rulesPageCopy.rulesHeading}
          rules={[...rules.generalRules.rules, ...rules.privateRules.rules]}
        />
        <Section
          heading={rulesPageCopy.agreementsHeading}
          rules={rules.agreements.rules}
        />
      </>
    ) : (
      <Alert>
        <AlertDescription>{rulesCopy.unavailable}</AlertDescription>
      </Alert>
    )}
  </>
)
