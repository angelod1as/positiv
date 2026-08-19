type FormProgressProps = {
  index: number
  total: number
}

/**
 * The bar carries the position for whoever sees it; the live region carries it
 * for whoever does not. Both are needed: each screen moves focus to its control,
 * so a screen reader announces the question and would never reach the bar.
 *
 * The visible copy is the fraction alone. `aria-valuetext` spells it out
 * because "3/14" read aloud is a slash, and the label says what is advancing —
 * a value with no name is announced as "progress bar, etapa 3 de 14".
 */
export function FormProgress({ index, total }: FormProgressProps) {
  return (
    <div className="flex flex-col gap-2">
      <div
        role="progressbar"
        aria-label="Progresso do formulário"
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
        {index}/{total}
      </p>
    </div>
  )
}
