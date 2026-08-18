import type { ReactNode } from "react"
import Markdown, { type Components } from "react-markdown"
import { Link } from "~/components/atoms/link/link"

const BLOCK_COMPONENTS: Components = {
  a: ({ href, children }) =>
    href?.startsWith("/") ? (
      <Link to={href}>{children}</Link>
    ) : (
      <Link to={href ?? ""} target="_blank" rel="noreferrer">
        {children}
      </Link>
    ),
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
