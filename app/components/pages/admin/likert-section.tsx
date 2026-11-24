import { useFetcher } from "react-router"
import { Label } from "~/components/ui/label"
import { Switch } from "~/components/ui/switch"
import { likertSettingCopy as copy } from "~/copy/admin"

function LikertSwitch({
  id,
  intent,
  label,
  help,
  checked,
}: {
  id: string
  intent: string
  label: string
  help: string
  checked: boolean
}) {
  const fetcher = useFetcher()

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-sm text-muted-foreground">{help}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={fetcher.state !== "idle"}
        onCheckedChange={(next) =>
          fetcher.submit(
            { intent, enabled: String(next) },
            { method: "POST" },
          )
        }
      />
    </div>
  )
}

export function LikertSection({
  enabled,
  required,
}: {
  enabled: boolean
  required: boolean
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2>{copy.title}</h2>

      <LikertSwitch
        id="likert-enabled"
        intent="set-likert"
        label={copy.accessLabel}
        help={copy.accessHelp}
        checked={enabled}
      />

      <LikertSwitch
        id="likert-required"
        intent="set-likert-required"
        label={copy.requiredLabel}
        help={copy.requiredHelp}
        checked={required}
      />
    </section>
  )
}
