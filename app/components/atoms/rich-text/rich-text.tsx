import {
  PortableText as PortableTextRenderer,
  type PortableTextComponents,
  type PortableTextMarkComponent,
} from "@portabletext/react"
import type { ReactNode } from "react"
import { Link } from "~/components/atoms/link/link"
import type { PortableText } from "~/business/cms/homepage-content.schema"

type LinkMark = { _type: "link"; href?: string }

const LinkMarkComponent: PortableTextMarkComponent<LinkMark> = ({
  value,
  children,
}) =>
  value?.href?.startsWith("/") ? (
    <Link to={value.href}>{children}</Link>
  ) : (
    <Link to={value?.href ?? ""} target="_blank" rel="noreferrer">
      {children}
    </Link>
  )

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
