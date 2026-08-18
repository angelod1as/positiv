import { Copy } from "~/components/atoms/copy/copy"
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { Separator } from "~/components/ui/separator"
import { rulesCopy } from "~/copy/events"

export const RulesText = () => {
  return (
    <>
      <h1>{rulesCopy.title}</h1>
      <Copy>{rulesCopy.intro}</Copy>

      {rulesCopy.sections.map((section) => (
        <div key={section.heading}>
          <Separator />
          <h4>{section.heading}</h4>
          <Copy>{section.body}</Copy>
          {section.alert && (
            <Alert className="flex flex-col gap-4">
              <AlertTitle>{section.alert.title}</AlertTitle>
              <AlertDescription className="flex flex-col gap-4">
                <Copy>{section.alert.body}</Copy>
              </AlertDescription>
            </Alert>
          )}
        </div>
      ))}
    </>
  )
}
