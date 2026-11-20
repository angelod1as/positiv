import { useFetcher } from "react-router"
import { Label } from "~/components/ui/label"
import { Switch } from "~/components/ui/switch"
import { likertSettingCopy as copy } from "~/copy/admin"

export function LikertSection({ enabled }: { enabled: boolean }) {
  const fetcher = useFetcher()

  return (
    <section className="flex flex-col gap-4">
      <h2>{copy.title}</h2>

      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="likert-enabled">{copy.label}</Label>
          <p className="text-sm text-muted-foreground">{copy.help}</p>
        </div>
        <Switch
          id="likert-enabled"
          checked={enabled}
          disabled={fetcher.state !== "idle"}
          onCheckedChange={(checked) =>
            fetcher.submit(
              { intent: "set-likert", enabled: String(checked) },
              { method: "POST" },
            )
          }
        />
      </div>
    </section>
  )
}
