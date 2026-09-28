import type { ReactNode } from "react"
import Markdown, { type Components } from "react-markdown"
import { ContentLink } from "~/components/atoms/content-link/content-link"

const BLOCK_COMPONENTS: Components = {
  a: ({ href, children }) => <ContentLink href={href}>{children}</ContentLink>,
}

const INLINE_COMPONENTS: Components = {
  ...BLOCK_COMPONENTS,
  p: ({ children }) => <>{children}</>,
}

type CopyProps = {
  children: string
  inline?: boolean
}

export const Copy = ({ children, inline = false }: CopyProps): ReactNode => (
  <Markdown components={inline ? INLINE_COMPONENTS : BLOCK_COMPONENTS}>
    {children}
  </Markdown>
)
