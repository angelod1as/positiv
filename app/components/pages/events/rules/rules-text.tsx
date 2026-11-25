import { ruleParts } from "~/business/cms/rule-parts"
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
        ruleParts.map(
          (part) =>
            rules[part].length > 0 && (
              <RulesPart key={part} part={part} rules={rules[part]} />
            ),
        )
      ) : (
        <Alert>
          <AlertDescription>{rulesCopy.unavailable}</AlertDescription>
        </Alert>
      )}
    </>
  )
}
