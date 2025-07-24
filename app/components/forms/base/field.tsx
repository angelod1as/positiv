import type { JSX } from "react"
import { cn } from "~/lib/utils"

export const Field = ({
  className,
  ...props
}: JSX.IntrinsicElements["div"]) => {
  return <div className={cn("flex flex-col", className)} {...props} />
}
