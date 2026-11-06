import type {
  GridSlot,
  NoteContext,
} from "~/components/forms/runtime/presentations/grid"
import {
  basicDataCopy,
  cpfExemptionCopy,
  genderPronounsOrientationCopy,
} from "~/copy/account"

type CpfExemptionLinks = { request: string; change: string }

const ExemptionRequest = ({
  links,
  answers,
  onAnswer,
}: NoteContext & { links: CpfExemptionLinks }) =>
  answers.cpf_exempt_requested === true ? (
    <p className="text-sm text-muted-foreground">
      {cpfExemptionCopy.pending}{" "}
      <button
        type="button"
        className="underline"
        onClick={() => onAnswer("cpf_exempt_requested", false)}
      >
        {cpfExemptionCopy.undo}
      </button>
    </p>
  ) : (
    <a
      href={links.request}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm underline"
      onClick={() => onAnswer("cpf_exempt_requested", true)}
    >
      {cpfExemptionCopy.requestLink}
    </a>
  )

const ExemptNotice = ({ links }: { links: CpfExemptionLinks }) => (
  <p className="text-sm text-muted-foreground">
    {cpfExemptionCopy.exempt}{" "}
    <a
      href={links.change}
      target="_blank"
      rel="noopener noreferrer"
      className="underline"
    >
      {cpfExemptionCopy.changeLink}
    </a>
  </p>
)

/**
 * The twelve-column arrangement the two screens had between them, now read as
 * one. The notes are slots rather than text above the form: what the documents
 * are for belongs immediately before the documents are asked for.
 */
export function buildBasicDataLayout({
  cpfExempt = false,
  links = null,
}: { cpfExempt?: boolean; links?: CpfExemptionLinks | null } = {}): GridSlot[] {
  const exemption: GridSlot[] = links
    ? [
        {
          kind: "note",
          id: "cpf_exemption",
          render: cpfExempt
            ? <ExemptNotice links={links} />
            : (note: NoteContext) => <ExemptionRequest links={links} {...note} />,
        },
      ]
    : []

  return [
    { kind: "question", id: "full_name", span: 5 },
    { kind: "question", id: "social_name", span: 4 },
    { kind: "question", id: "date_of_birth", span: 3 },
    { kind: "question", id: "where_lives", span: 6 },
    { kind: "question", id: "how_came_to_us", span: 6 },
    { kind: "question", id: "phone_is_international", span: 12 },
    { kind: "question", id: "phone", span: 6 },
    { kind: "question", id: "confirm_phone", span: 6 },
    {
      kind: "note",
      id: "documents",
      render: (
        <p className="mt-4 text-sm text-muted-foreground">
          {basicDataCopy.documentsNotice}
        </p>
      ),
    },
    ...(cpfExempt
      ? []
      : [{ kind: "question", id: "cpf", span: 4 } satisfies GridSlot]),
    { kind: "question", id: "rg", span: cpfExempt ? 6 : 4 },
    { kind: "question", id: "rg_issuer", span: cpfExempt ? 6 : 4 },
    ...exemption,
    { kind: "question", id: "gender", span: 6 },
    { kind: "question", id: "orientation", span: 6 },
    { kind: "question", id: "pronouns", span: 6 },
    { kind: "question", id: "race_color", span: 6 },
    {
      kind: "note",
      id: "race",
      render: (
        <p className="mt-4 text-sm text-muted-foreground">
          {genderPronounsOrientationCopy.raceNotice}
        </p>
      ),
    },
  ]
}
