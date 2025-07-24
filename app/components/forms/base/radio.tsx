import * as React from "react"
import { cn } from "~/lib/utils"

export const Radio = React.forwardRef<
  HTMLInputElement,
  React.JSX.IntrinsicElements["input"]
>(({ type = "radio", className, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "mt-[3px] border-black text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive aspect-square size-4 shrink-0 rounded-full border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 accent-black",
      className,
    )}
    {...props}
  />
))

Radio.displayName = "Radio"
