import { CheckIcon } from "lucide-react"
import * as React from "react"
import { cn } from "~/lib/utils"

export const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.JSX.IntrinsicElements["input"]
>(({ className, checked, onChange, ...props }, ref) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input
      ref={ref}
      type="checkbox"
      className="sr-only"
      role="checkbox"
      checked={checked}
      onChange={onChange}
      {...props}
    />
    <div
      data-testid="checkbox"
      className={cn(
        "w-4 h-4 border rounded-[4px] transition-shadow",
        "flex items-center justify-center",
        checked ? "bg-primary border-primary" : "bg-input/30 border-input",
      )}
    >
      <CheckIcon className="w-3 h-3 text-primary-foreground" />
    </div>
  </label>
))

Checkbox.displayName = "Checkbox"
