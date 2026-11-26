import type { Rule, Rules } from "~/business/cms/rules.schema"
import { RulesPart } from "~/components/organisms/rules/rules-part"
import { PageTitle } from "~/components/pages/page/header/page-title"
import { Alert, AlertDescription } from "~/components/ui/alert"
import { rulesPageCopy } from "~/copy/dashboard"
import { rulesCopy } from "~/copy/events"
import type { FCC } from "~types/utils/utils.types"

type RulesAndAgreementsProps = { rules: Rules | null }

const Column: FCC = ({ children }) => (
  <section className="w-full px-4 py-8 md:px-6">
    <div className="mx-auto max-w-3xl">{children}</div>
  </section>
)

const Section = ({ heading, rules }: { heading: string; rules: Rule[] }) =>
  rules.length > 0 ? (
    <Column>
      <RulesPart title={heading} rules={rules} />
    </Column>
  ) : null

export const RulesAndAgreements = ({ rules }: RulesAndAgreementsProps) => (
  <div>
    <PageTitle content={{ _type: "pageTitle", title: rulesPageCopy.title }} />

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
      <Column>
        <Alert>
          <AlertDescription>{rulesCopy.unavailable}</AlertDescription>
        </Alert>
      </Column>
    )}
  </div>
)
