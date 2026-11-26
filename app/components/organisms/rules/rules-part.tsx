import type { Rule } from "~/business/cms/rules.schema"
import { LongRichText } from "~/components/atoms/rich-text/rich-text"
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"

type RulesPartProps = {
  title?: string | null
  subtitle?: string | null
  rules: Rule[]
}

export const RulesPart = ({ title, subtitle, rules }: RulesPartProps) => (
  <div className="flex flex-col gap-12">
    {(title || subtitle) && (
      <div className="flex flex-col gap-2">
        {title && <h2 className="border-b-0 pb-0">{title}</h2>}
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </div>
    )}
    {rules.map((rule) => (
      <div key={rule._key} className="flex flex-col gap-4">
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
