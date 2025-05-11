import { CheckIcon } from "lucide-react"
import * as React from "react"
import { cn } from "~/lib/utils"

export const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.JSX.IntrinsicElements["input"]
>(({ className, ...props }, ref) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input
      ref={ref}
      type="checkbox"
      className="sr-only peer"
      role="checkbox"
      {...props}
    />
    <div
      data-testid="checkbox"
      className={cn(
        "w-4 h-4 bg-input/30 border border-input rounded-[4px] peer-checked:bg-primary peer-checked:border-primary peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 transition-shadow",
        "flex items-center justify-center",
      )}
    >
      <CheckIcon className="w-3 h-3 text-primary-foreground" />
    </div>
  </label>
))

Checkbox.displayName = "Checkbox"
