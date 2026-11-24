import {
  PortableText as PortableTextRenderer,
  type PortableTextComponents,
  type PortableTextMarkComponent,
} from "@portabletext/react"
import type { ReactNode } from "react"
import { ContentLink } from "~/components/atoms/content-link/content-link"
import type {
  LongPortableText,
  PortableText,
} from "~/business/cms/content.schema"

type LinkMark = { _type: "link"; href?: string }

const LinkMarkComponent: PortableTextMarkComponent<LinkMark> = ({
  value,
  children,
}) => <ContentLink href={value?.href}>{children}</ContentLink>

const MARKS: PortableTextComponents["marks"] = {
  strong: ({ children }) => <strong>{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  link: LinkMarkComponent,
}

const BLOCK_COMPONENTS: PortableTextComponents = {
  block: { normal: ({ children }) => <p>{children}</p> },
  marks: MARKS,
}

const INLINE_COMPONENTS: PortableTextComponents = {
  block: { normal: ({ children }) => <>{children}</> },
  marks: MARKS,
}

const LONG_COMPONENTS: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p>{children}</p>,
    h2: ({ children }) => (
      <h2 className="mt-6 text-2xl first:mt-0">{children}</h2>
    ),
    subtitle1: ({ children }) => (
      <p className="-mt-6 text-lg text-muted-foreground first:mt-0">{children}</p>
    ),
    h3: ({ children }) => (
      <h3 className="mt-6 text-xl first:mt-0">{children}</h3>
    ),
    subtitle2: ({ children }) => (
      <p className="-mt-6 text-base text-muted-foreground first:mt-0">{children}</p>
    ),
    h4: ({ children }) => (
      <h4 className="mt-6 text-lg first:mt-0">{children}</h4>
    ),
    subtitle3: ({ children }) => (
      <p className="-mt-6 text-base text-muted-foreground first:mt-0">{children}</p>
    ),
    blockquote: ({ children }) => <blockquote>{children}</blockquote>,
  },
  list: {
    bullet: ({ children }) => <ul className="list-disc pl-6">{children}</ul>,
    number: ({ children }) => <ol>{children}</ol>,
  },
  listItem: ({ children }) => <li>{children}</li>,
  marks: MARKS,
}

const withoutBlankBlocks = <Block extends LongPortableText[number]>(
  value: Block[],
): Block[] =>
  value.filter((block) =>
    block.children.some((span) => span.text.trim() !== ""),
  )

type RichTextProps = {
  value: PortableText
  inline?: boolean
}

export const RichText = ({
  value,
  inline = false,
}: RichTextProps): ReactNode => (
  <PortableTextRenderer
    value={withoutBlankBlocks(value)}
    components={inline ? INLINE_COMPONENTS : BLOCK_COMPONENTS}
  />
)

type LongRichTextProps = {
  value: LongPortableText
}

export const LongRichText = ({ value }: LongRichTextProps): ReactNode => (
  <PortableTextRenderer
    value={withoutBlankBlocks(value)}
    components={LONG_COMPONENTS}
  />
)
