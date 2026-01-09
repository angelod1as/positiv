import type { ReactNode } from "react"
import { Link } from "~/components/atoms/link/link"
import { cn } from "~/lib/utils"

interface AGIconButtonProps {
  children: ReactNode
  title: string
  to?: string
  href?: string
  external?: boolean
  className?: string
}

const baseStyles = cn(
  "inline-flex items-center justify-center",
  "p-1 rounded",
  "border border-gray-300",
  "hover:bg-gray-100 hover:border-gray-400",
  "transition-colors"
)

export function AGIconButton({
  children,
  title,
  to,
  href,
  external,
  className,
}: AGIconButtonProps) {
  const combinedClassName = cn(baseStyles, className)

  if (href) {
    return (
      <a
        href={href}
        title={title}
        aria-label={title}
        className={combinedClassName}
        {...(external && { target: "_blank", rel: "noopener noreferrer" })}
      >
        {children}
      </a>
    )
  }

  if (to) {
    return (
      <Link to={to} title={title} aria-label={title} className={combinedClassName}>
        {children}
      </Link>
    )
  }

  return (
    <span title={title} className={combinedClassName}>
      {children}
    </span>
  )
}
