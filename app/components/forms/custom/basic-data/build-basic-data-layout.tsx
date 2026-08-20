import type { GridSlot } from "~/components/forms/runtime/presentations/grid"
import { basicDataCopy, genderPronounsOrientationCopy } from "~/copy/account"

/**
 * The twelve-column arrangement the two screens had between them, now read as
 * one. The notes are slots rather than text above the form: what the documents
 * are for belongs immediately before the documents are asked for.
 */
export function buildBasicDataLayout(): GridSlot[] {
  return [
    { kind: "question", id: "full_name", span: 5 },
    { kind: "question", id: "social_name", span: 4 },
    { kind: "question", id: "date_of_birth", span: 3 },
    { kind: "question", id: "where_lives", span: 6 },
    { kind: "question", id: "how_came_to_us", span: 6 },
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
    { kind: "question", id: "cpf", span: 4 },
    { kind: "question", id: "rg", span: 4 },
    { kind: "question", id: "rg_issuer", span: 4 },
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
