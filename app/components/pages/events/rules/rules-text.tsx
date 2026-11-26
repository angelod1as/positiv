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
            rules[part].rules.length > 0 && (
              <RulesPart
                key={part}
                title={rules[part].title}
                subtitle={rules[part].subtitle}
                rules={rules[part].rules}
              />
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
