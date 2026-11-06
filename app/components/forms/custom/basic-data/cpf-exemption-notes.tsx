import type { NoteContext } from "~/components/forms/runtime/presentations/grid"
import { cpfExemptionCopy } from "~/copy/account"

export type CpfExemptionLinks = { request: string; change: string }

export const ExemptionRequest = ({
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

export const ExemptNotice = ({ links }: { links: CpfExemptionLinks }) => (
  <a
    href={links.change}
    target="_blank"
    rel="noopener noreferrer"
    className="text-sm underline"
  >
    {cpfExemptionCopy.exemptLink}
  </a>
)
