import { cn } from "~/lib/utils"
import type { FCC } from "~types/utils/utils.types"

export const Section: FCC<{ className?: string; hasBg?: boolean }> = ({
  children,
  className,
  hasBg,
}) => {
  return (
    <section
      className={cn(
        "w-full py-12 md:py-24 lg:py-32",
        hasBg ? "bg-image text-white" : "bg-white",
        className,
      )}
    >
      {children}
    </section>
  )
}
