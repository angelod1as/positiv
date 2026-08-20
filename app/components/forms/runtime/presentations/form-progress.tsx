import { formRuntimeCopy } from "~/copy/forms"

type FormProgressProps = {
  index: number
  total: number
}

/**
 * The bar carries the position for whoever sees it, the live region for whoever
 * does not: each screen moves focus to its control, so a screen reader would
 * never reach the bar. `aria-valuetext` spells the fraction out, because "3/14"
 * read aloud is a slash.
 */
export function FormProgress({ index, total }: FormProgressProps) {
  return (
    <div className="flex flex-col gap-2">
      <div
        role="progressbar"
        aria-label={formRuntimeCopy.progressLabel}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={index}
        aria-valuetext={`Etapa ${index} de ${total}`}
        className="bg-muted h-1 w-full overflow-hidden rounded-full"
      >
        <div
          className="bg-primary h-full transition-all"
          style={{ width: `${(index / total) * 100}%` }}
        />
      </div>

      <p aria-live="polite" className="text-muted-foreground text-sm">
        {formRuntimeCopy.progressOf(index, total)}
      </p>
    </div>
  )
}
