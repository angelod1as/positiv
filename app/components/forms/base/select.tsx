import * as React from "react"
import { cn } from "~/lib/utils"

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.JSX.IntrinsicElements["select"]
>(({ className, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "block w-full rounded-md py-2 pr-10 pl-3 text-base text-gray-800 focus:outline-none sm:text-sm border border-muted-foreground",
        className,
      )}
      style={{
        // Fix bugged border color
        borderColor: "inherit",
      }}
      {...props}
    />
  )
})

Select.displayName = "Select"
