import type { GridSlot } from "~/components/forms/runtime/presentations/grid"
import { adminEventsCopy } from "~/copy/admin/events"
import { CalculateDates, Section, Subsection } from "./event-form-notes"

const formCopy = adminEventsCopy.form

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
