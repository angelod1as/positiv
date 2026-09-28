import type { ReactNode } from "react"
import { Link } from "~/components/atoms/link/link"

type ContentLinkProps = {
  href?: string
  children?: ReactNode
}

export const ContentLink = ({ href, children }: ContentLinkProps): ReactNode =>
  href?.startsWith("/") ? (
    <Link to={href}>{children}</Link>
  ) : (
    <Link to={href ?? ""} target="_blank" rel="noreferrer">
      {children}
    </Link>
  )
