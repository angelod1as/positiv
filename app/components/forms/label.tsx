import type { JSX } from "react"
import { cn } from "~/lib/utils"

export const Label = ({
  className,
  ...props
}: JSX.IntrinsicElements["label"]) => {
  return (
    <label
      className={cn(
        "block font-medium",
        className,
        !className && "text-gray-400",
      )}
      {...props}
    />
  )
}
