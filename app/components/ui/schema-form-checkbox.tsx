import { CheckIcon } from "lucide-react"
import * as React from "react"
import { cn } from "~/lib/utils"

const SchemaFormCheckbox = React.forwardRef<
  HTMLInputElement,
  React.JSX.IntrinsicElements["input"]
>(({ className, ...props }, ref) => (
  <label className="relative inline-flex items-start -mt-[2px] cursor-pointer">
    <input ref={ref} type="checkbox" className="sr-only peer" {...props} />
    <span
      className={cn(
        "peer-checked:border-primary peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 border rounded-[4px] transition-shadow mt-1 h-4 w-4 border-gray-300 peer-checked:bg-black peer-focus:ring-2 peer-focus:ring-offset-2",
        "peer-checked:border-primary peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        "w-4 h-4 border rounded-[4px] transition-shadow",
        "flex items-center justify-center",
        className,
      )}
    >
      <CheckIcon className="w-3 h-3 text-primary-foreground" />
    </span>
  </label>
))

SchemaFormCheckbox.displayName = "SchemaFormCheckbox"

export default SchemaFormCheckbox
