import { CheckIcon } from "lucide-react"
import * as React from "react"
import { cn } from "~/lib/utils"

export const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.JSX.IntrinsicElements["input"]
>(({ className, checked, onChange, ...props }, ref) => {
  return (
    <label className="relative inline-flex items-start mt-[2px] cursor-pointer">
      <input
        ref={ref}
        type="checkbox"
        className="sr-only peer"
        role="checkbox"
        checked={checked}
        onChange={onChange}
        {...props}
      />
      <div
        data-testid="checkbox"
        className={cn(
          "peer-checked:border-primary peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
          "w-4 h-4 border rounded-[4px] transition-shadow",
          "flex items-center justify-center",
          checked ? "bg-primary border-primary" : "border-black",
        )}
      >
        {checked && <CheckIcon className="w-3 h-3 text-primary-foreground" />}
      </div>
    </label>
  )
})

Checkbox.displayName = "Checkbox"
