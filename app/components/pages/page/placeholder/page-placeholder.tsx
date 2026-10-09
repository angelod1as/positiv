import { cmsPreviewCopy } from "~/copy/cms"
import { Section } from "../section/section"

type PagePlaceholderProps = {
  missing: string[]
  variant: "section" | "header"
}

export const PagePlaceholder = ({ missing, variant }: PagePlaceholderProps) => {
  const message =
    variant === "header"
      ? cmsPreviewCopy.incompleteHeader(missing)
      : cmsPreviewCopy.incompleteSection(missing)

  const notice = (
    <p
      role="note"
      className="mx-auto max-w-(--breakpoint-md) rounded-md border-2 border-dashed border-amber-400 bg-amber-50 px-4 py-6 text-center text-amber-900"
    >
      {message}
    </p>
  )

  if (variant === "header") return notice
  return <Section>{notice}</Section>
}
