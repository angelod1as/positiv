import type { Rules } from "~/business/cms/rules.schema"
import { Copy } from "~/components/atoms/copy/copy"
import { RulesPart } from "~/components/organisms/rules/rules-part"
import { Alert, AlertDescription } from "~/components/ui/alert"
import { rulesCopy } from "~/copy/events"

type RulesTextProps = { rules: Rules | null }

export const RulesText = ({ rules }: RulesTextProps) => {
  return (
    <>
      <h1>{rulesCopy.title}</h1>
      <Copy>{rulesCopy.intro}</Copy>

      {rules ? (
        <>
          <RulesPart part="generalRules" rules={rules.generalRules} />
          <RulesPart part="agreements" rules={rules.agreements} />
          <RulesPart part="privateRules" rules={rules.privateRules} />
        </>
      ) : (
        <Alert>
          <AlertDescription>{rulesCopy.unavailable}</AlertDescription>
        </Alert>
      )}
    </>
  )
}
