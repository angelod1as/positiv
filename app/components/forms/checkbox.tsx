import * as React from "react"
import { cn } from "~/lib/utils"

export const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.JSX.IntrinsicElements["input"]
>(({ type = "checkbox", className, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "h-4 w-4 rounded",
      className,
      !className && "border-gray-300 text-pink-600 focus:ring-pink-500",
    )}
    {...props}
  />
))

Checkbox.displayName = "Checkbox"
