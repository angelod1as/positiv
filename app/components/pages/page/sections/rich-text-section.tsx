import type { PageSection } from "~/business/cms/page.schema"
import { LongRichText } from "~/components/atoms/rich-text/rich-text"

type RichTextSectionProps = {
  content: Extract<PageSection, { _type: "richTextSection" }>
}

export const RichTextSection = ({ content }: RichTextSectionProps) => {
  return (
    <section className="w-full px-4 py-8 md:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {content.title && <h2>{content.title}</h2>}
        <LongRichText value={content.body} />
      </div>
    </section>
  )
}
