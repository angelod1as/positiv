import type { ReactNode } from "react"
import { Link } from "~/components/atoms/link/link"

type ContentLinkProps = {
  href?: string
  children?: ReactNode
  className?: string
  onClick?: () => void
  "aria-current"?: "page"
}

export const ContentLink = ({
  href,
  children,
  className,
  onClick,
  "aria-current": ariaCurrent,
}: ContentLinkProps): ReactNode =>
  href?.startsWith("/") ? (
    <Link
      to={href}
      className={className}
      onClick={onClick}
      aria-current={ariaCurrent}
    >
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
