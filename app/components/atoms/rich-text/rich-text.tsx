import {
  PortableText as PortableTextRenderer,
  type PortableTextComponents,
  type PortableTextMarkComponent,
} from "@portabletext/react"
import type { ReactNode } from "react"
import { ContentLink } from "~/components/atoms/content-link/content-link"
import type { PortableText } from "~/business/cms/homepage-content.schema"

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

type RichTextProps = {
  value: PortableText
  inline?: boolean
}

export const RichText = ({
  value,
  inline = false,
}: RichTextProps): ReactNode => (
  <PortableTextRenderer
    value={value}
    components={inline ? INLINE_COMPONENTS : BLOCK_COMPONENTS}
  />
)
