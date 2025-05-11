import React, { type ComponentPropsWithoutRef } from "react"
import { Link as RouterLink } from "react-router"
import { cn } from "~/lib/utils"

type LinkPropsWithoutRef = ComponentPropsWithoutRef<typeof RouterLink>

interface CustomLinkProps extends LinkPropsWithoutRef {
  variant?: "default" | "unstyled"
}

export const Link: React.FC<CustomLinkProps> = ({
  className,
  variant = "default",
  ...props
}) => {
  const styles =
    variant === "unstyled"
      ? ""
      : "underline underline-offset-3 hover:text-purple transition-colors duration-150"

  return (
    <RouterLink className={cn(styles, className)} {...props}>
      {props.children}
    </RouterLink>
  )
}
