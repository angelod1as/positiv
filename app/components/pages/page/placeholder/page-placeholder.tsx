import { cmsPreviewCopy } from "~/copy/cms"
import { Section } from "../section/section"

type PagePlaceholderProps = {
  missing: string[]
  variant: "section" | "header"
}

const labelFor = (field: string) =>
  cmsPreviewCopy.fieldLabels[
    field as keyof typeof cmsPreviewCopy.fieldLabels
  ] ?? cmsPreviewCopy.genericMissing

const describeMissing = (missing: string[]) => {
  const labels = [...new Set(missing.map(labelFor))]
  if (labels.length === 0) return cmsPreviewCopy.genericMissing
  if (labels.length === 1) return labels[0]
  return `${labels.slice(0, -1).join(cmsPreviewCopy.separator)}${cmsPreviewCopy.and}${labels[labels.length - 1]}`
}

export const PagePlaceholder = ({ missing, variant }: PagePlaceholderProps) => {
  const heading =
    variant === "header"
      ? cmsPreviewCopy.incompleteHeader
      : cmsPreviewCopy.incompleteSection
  const message = `${heading}: ${cmsPreviewCopy.missingPrefix} ${describeMissing(missing)}`

  const notice = (
    <p
      role="status"
      className="mx-auto max-w-(--breakpoint-md) rounded-md border-2 border-dashed border-amber-400 bg-amber-50 px-4 py-6 text-center text-amber-900"
    >
      {message}
    </p>
  )

  if (variant === "header") return notice
  return <Section>{notice}</Section>
}
