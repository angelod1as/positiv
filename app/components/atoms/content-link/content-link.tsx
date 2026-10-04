import type { ReactNode } from "react"
import { Link } from "~/components/atoms/link/link"

type ContentLinkProps = {
  href?: string
  children?: ReactNode
  className?: string
  onClick?: () => void
}

export const ContentLink = ({
  href,
  children,
  className,
  onClick,
}: ContentLinkProps): ReactNode =>
  href?.startsWith("/") ? (
    <Link to={href} className={className} onClick={onClick}>
      {children}
    </Link>
  ) : (
    <Link
      to={href ?? ""}
      target="_blank"
      rel="noreferrer"
      className={className}
      onClick={onClick}
    >
      {children}
    </Link>
  )
