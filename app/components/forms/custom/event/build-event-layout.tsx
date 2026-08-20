import { useState } from "react"
import { Button } from "~/components/atoms/button/button"
import { calculateDerivedDates } from "~/components/forms/admin/calculate-derived-dates"
import { Error } from "~/components/forms/base/error"
import type {
  GridSlot,
  NoteContext,
} from "~/components/forms/runtime/presentations/grid"
import { Separator } from "~/components/ui/separator"
import { adminEventsCopy } from "~/copy/admin/events"
import type { FCC } from "~types/utils/utils.types"

const formCopy = adminEventsCopy.form

// The levels follow the page, which opens on an h1; the sizes follow the form,
// where a section heading is a signpost rather than a title.
const Section: FCC = ({ children }) => (
  <h2 className="border-b-0 pt-4 pb-0 text-lg">{children}</h2>
)

const Subsection: FCC = ({ children }) => (
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
const CalculateDates = ({ answers, onAnswer, isBusy }: NoteContext) => {
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

/**
 * The twelve-column arrangement the form has today, read as a list of slots.
 * Build it once and hold it: a presentation that changes identity remounts the
 * run, and with it everything already typed.
 */
export function buildEventLayout(): GridSlot[] {
  return [
    {
      kind: "note",
      id: "dados-gerais",
      render: <Section>{formCopy.sections.generalData}</Section>,
    },
    { kind: "question", id: "title", span: 9 },
    { kind: "question", id: "emoji", span: 3 },
    { kind: "question", id: "description", span: 12 },
    { kind: "question", id: "location", span: 7 },
    { kind: "question", id: "ticket_price", span: 2 },
    { kind: "question", id: "total_spots", span: 3 },
    { kind: "question", id: "auto_publish", span: 12 },

    {
      kind: "note",
      id: "datas",
      render: (note) => <CalculateDates {...note} />,
    },
    { kind: "question", id: "time_event_start", span: 6 },
    { kind: "question", id: "time_event_end", span: 6 },

    {
      kind: "note",
      id: "candidaturas",
      render: <Subsection>{formCopy.sections.applications}</Subsection>,
    },
    { kind: "question", id: "time_application_start", span: 6 },

    {
      kind: "note",
      id: "grupo",
      render: <Subsection>{formCopy.sections.group}</Subsection>,
    },
    { kind: "question", id: "time_group_start", span: 6 },
    { kind: "question", id: "time_group_end", span: 6 },

    {
      kind: "note",
      id: "pagamentos",
      render: <Subsection>{formCopy.sections.payments}</Subsection>,
    },
    { kind: "question", id: "time_payment_start", span: 6 },
    { kind: "question", id: "time_payment_end", span: 6 },
  ]
}
