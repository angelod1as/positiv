import { cn } from "~/lib/utils"
import type { FCC } from "~types/utils/utils.types"
import { useOverlay } from "../overlay/overlay-context"

export const Section: FCC<{ className?: string; hasBg?: boolean }> = ({
  children,
  className,
  hasBg,
}) => {
  const overlay = useOverlay()

  return (
    <section
      className={cn(
        "w-full py-12 md:py-24 lg:py-32",
        hasBg ? "bg-image text-white" : "bg-white",
        className,
      )}
      {...(overlay && { "data-sanity-edit-target": "" })}
    >
      {children}
    </section>
  )
}
