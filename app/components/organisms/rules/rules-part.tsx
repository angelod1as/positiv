import type { RulePart } from "~/business/cms/rule-parts"
import type { Rule } from "~/business/cms/rules.schema"
import { LongRichText } from "~/components/atoms/rich-text/rich-text"
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { Separator } from "~/components/ui/separator"
import { rulesPartCopy } from "~/copy/rules"

type RulesPartProps = { part: RulePart; rules: Rule[] }

export const RulesPart = ({ part, rules }: RulesPartProps) => (
  <div className="flex flex-col gap-8">
    <h2>{rulesPartCopy[part]}</h2>
    {rules.map((rule, index) => (
      <div key={rule._key} className="flex flex-col gap-4">
        {index > 0 && <Separator />}
        <h3>{rule.title}</h3>
        <LongRichText value={rule.body} />
        {rule.highlight && (
          <Alert className="flex flex-col gap-4">
            {rule.highlight.title && (
              <AlertTitle>{rule.highlight.title}</AlertTitle>
            )}
            <AlertDescription className="flex flex-col gap-4">
              <LongRichText value={rule.highlight.body} />
            </AlertDescription>
          </Alert>
        )}
      </div>
    ))}
  </div>
)
