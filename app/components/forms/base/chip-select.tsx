import { X } from "lucide-react"
import { useState, type KeyboardEvent } from "react"
import { Button } from "~/components/atoms/button/button"
import { Badge } from "~/components/ui/badge"
import { Input } from "~/components/ui/input"
import { chipSelectCopy } from "~/copy/forms"
import { cn } from "~/lib/utils"

type Option = { label: string; value: string }

type ChipSelectProps = {
  options: Option[]
  value: string[]
  onChange: (value: string[]) => void
  /** Lets someone add what the list does not offer. Without it there is no field. */
  allowOther?: boolean
  /** The invitation written in the free field — each question may word its own. */
  otherPlaceholder?: string
  id?: string
  labelledBy?: string
  className?: string
}

/**
 * A comma is how the field this replaces asked for more than one value, so it
 * still ends one here — along with a semicolon, for a list pasted from
 * elsewhere. Neither is advertised: the button and Enter are.
 */
const SEPARATORS = /[,;]/

const fold = (value: string) => value.trim().toLowerCase()

/**
 * Multiple choice where the answer may be something the list never thought of.
 *
 * The array is the whole truth: a value the options know draws its pill turned
 * on, and a value they do not draws a chip of its own. Nothing records that
 * someone is "adding an other" — there is no such state to get out of step, and
 * an answer loaded from elsewhere needs no unpacking to show up right.
 */
export const ChipSelect = ({
  options,
  value,
  onChange,
  allowOther = false,
  otherPlaceholder,
  id,
  labelledBy,
  className,
}: ChipSelectProps) => {
  const [draft, setDraft] = useState("")
  const [announcement, setAnnouncement] = useState("")

  const known = new Set(options.map((option) => option.value))
  const custom = value.filter((item) => !known.has(item))

  const toggle = (option: string) => {
    const isOn = value.includes(option)
    onChange(
      isOn ? value.filter((item) => item !== option) : [...value, option],
    )
  }

  const remove = (item: string) => {
    onChange(value.filter((current) => current !== item))
    setAnnouncement(chipSelectCopy.removed(item))
  }

  const commitDraft = () => {
    const taken = new Set([...value, ...known].map(fold))
    const added: string[] = []

    for (const piece of draft.split(SEPARATORS)) {
      const candidate = piece.trim()
      if (!candidate || taken.has(fold(candidate))) continue

      taken.add(fold(candidate))
      added.push(candidate)
    }

    setDraft("")
    if (added.length === 0) return

    onChange([...value, ...added])
    setAnnouncement(chipSelectCopy.added(added.join(", ")))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Enter inside a form submits it, which here would send the whole run off
    // while someone is still writing an answer.
    if (event.key === "Enter" || SEPARATORS.test(event.key)) {
      event.preventDefault()
      commitDraft()
      return
    }

    if (event.key === "Backspace" && draft === "" && custom.length > 0) {
      remove(custom[custom.length - 1])
    }
  }

  return (
    <div
      id={id}
      role="group"
      aria-labelledby={labelledBy}
      className={cn("flex flex-col gap-3", className)}
    >
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isOn = value.includes(option.value)

          return (
            <Badge
              key={option.value}
              asChild
              variant={isOn ? "default" : "outline"}
              className="cursor-pointer px-3 py-1 text-sm"
            >
              <button
                type="button"
                aria-pressed={isOn}
                onClick={() => toggle(option.value)}
              >
                {option.label}
              </button>
            </Badge>
          )
        })}

        {custom.map((item) => (
          <Badge
            key={item}
            variant="secondary"
            className="gap-1 px-3 py-1 text-sm"
          >
            {item}
            <button
              type="button"
              aria-label={chipSelectCopy.remove(item)}
              onClick={() => remove(item)}
              className="cursor-pointer rounded-full opacity-70 hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>

      {allowOther ? (
        <div className="flex gap-2">
          <Input
            value={draft}
            placeholder={otherPlaceholder ?? chipSelectCopy.otherPlaceholder}
            // A soft keyboard has no key called Enter; this is what turns the
            // one it does have into something that reads like finishing.
            enterKeyHint="done"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            onBlur={commitDraft}
          />
          <Button
            type="button"
            variant="outline"
            disabled={draft.trim() === ""}
            onClick={commitDraft}
          >
            {chipSelectCopy.otherAdd}
          </Button>
        </div>
      ) : null}

      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </div>
  )
}
