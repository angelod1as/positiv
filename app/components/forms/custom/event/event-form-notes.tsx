import { useState } from "react"
import { Button } from "~/components/atoms/button/button"
import { calculateDerivedDates } from "~/components/forms/admin/calculate-derived-dates"
import { Error } from "~/components/forms/base/error"
import type { NoteContext } from "~/components/forms/runtime/presentations/grid"
import { Separator } from "~/components/ui/separator"
import { adminEventsCopy } from "~/copy/admin/events"
import type { FCC } from "~types/utils/utils.types"

const formCopy = adminEventsCopy.form

// The levels follow the page, which opens on an h1; the sizes follow the form,
// where a section heading is a signpost rather than a title.
export const Section: FCC = ({ children }) => (
  <h2 className="border-b-0 pt-4 pb-0 text-lg">{children}</h2>
)

export const Subsection: FCC = ({ children }) => (
  <h3 className="pt-4 text-base">{children}</h3>
)

/**
 * The dates an event implies, written in from the one it starts at. Every one
 * of them is overwritten, which is the point: the button exists to lay the
 * whole calendar out again from a new starting time.
 *
 * The complaint about a missing start time lives here rather than under that
 * field, because this is a button that refused rather than a field that did:
 * the message belongs where the click was.
 */
export const CalculateDates = ({ answers, onAnswer, isBusy }: NoteContext) => {
  const [missingStart, setMissingStart] = useState(false)

  const startingTime =
    typeof answers.time_event_start === "string" ? answers.time_event_start : ""

  const fillIn = () => {
    if (!startingTime) {
      setMissingStart(true)
      return
    }

    setMissingStart(false)

    for (const [field, value] of Object.entries(
      calculateDerivedDates(startingTime),
    )) {
      onAnswer(field, value)
    }
  }

  return (
    <>
      <Separator className="mt-8" />

      <div className="flex items-baseline justify-between gap-4">
        <Section>{formCopy.sections.dates}</Section>
        <Button
          type="button"
          variant="default"
          disabled={isBusy}
          onClick={fillIn}
        >
          {formCopy.calculateDates}
        </Button>
      </div>

      {missingStart ? (
        <Error role="alert">{formCopy.startDateRequired}</Error>
      ) : null}
    </>
  )
}
