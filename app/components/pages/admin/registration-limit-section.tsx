import { type FormEvent, useState } from "react"
import { useFetcher } from "react-router"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { registrationLimitSettingCopy as copy } from "~/copy/admin"
import { MAX_REGISTRATION_LIMIT } from "~/lib/constants/constants"

export function RegistrationLimitSection({ limit }: { limit: number }) {
  const fetcher = useFetcher<{ intent: string; error?: string }>()
  const [value, setValue] = useState(String(limit))
  const [shownLimit, setShownLimit] = useState(limit)
  if (limit !== shownLimit) {
    setShownLimit(limit)
    setValue(String(limit))
  }
  const isSubmitting = fetcher.state !== "idle"

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    fetcher.submit(
      { intent: "set-registration-limit", limit: value },
      { method: "POST" },
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <h2>{copy.title}</h2>

      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <Label htmlFor="registration-limit">{copy.label}</Label>
        <p className="text-sm text-muted-foreground">{copy.help}</p>
        <div className="flex items-center gap-2">
          <Input
            id="registration-limit"
            type="number"
            min={1}
            max={MAX_REGISTRATION_LIMIT}
            step={1}
            className="w-32"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <Button type="submit" disabled={isSubmitting}>
            {copy.save}
          </Button>
        </div>
        {fetcher.data?.error && (
          <p role="alert" className="text-sm text-destructive">
            {fetcher.data.error}
          </p>
        )}
      </form>
    </section>
  )
}
