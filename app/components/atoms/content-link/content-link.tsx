import type { ReactNode } from "react"
import { Link } from "~/components/atoms/link/link"

type ContentLinkProps = {
  href?: string
  children?: ReactNode
  className?: string
}

export const ContentLink = ({
  href,
  children,
  className,
}: ContentLinkProps): ReactNode =>
  href?.startsWith("/") ? (
    <Link to={href} className={className}>
      {children}
    </Link>
  ) : (
    <Link to={href ?? ""} target="_blank" rel="noreferrer" className={className}>
      {children}
    </Link>
  )
