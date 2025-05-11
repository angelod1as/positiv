import * as React from "react"

import { cn } from "~/lib/utils"

export const Input = React.forwardRef<
  HTMLInputElement,
  React.JSX.IntrinsicElements["input"]
>(({ type = "text", className, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "flex h-9 w-full min-w-0",
      "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
      "placeholder:text-muted-foreground border-input rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm",
      "selection:bg-primary selection:text-primary-foreground",
      "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
      "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
      className,
    )}
    {...props}
  />
))

Input.displayName = "Input"
