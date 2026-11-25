import { LIKERT_CHOICES } from "~/components/forms/runtime/likert"
import { likertCopy } from "~/copy/forms"
import { cn } from "~/lib/utils"

const TONES = [
  { side: "disagree", className: "bg-likert-1 text-white" },
  { side: "disagree", className: "bg-likert-2 text-neutral-900" },
  { side: "neutral", className: "bg-likert-3 text-white" },
  { side: "agree", className: "bg-likert-4 text-neutral-900" },
  { side: "agree", className: "bg-likert-5 text-white" },
] as const

export function LikertAnswerScale({ answer }: { answer: number }) {
  const choice = LIKERT_CHOICES[answer - 1]
  const tone = TONES[answer - 1]
  if (!choice || !tone) return null

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span
        data-side={tone.side}
        className={cn(
          "rounded-full px-3 py-1 text-sm font-semibold",
          tone.className,
        )}
      >
        {likertCopy.choices[choice]}
      </span>
      <div aria-hidden="true" className="flex gap-1">
        {TONES.map((point, index) => {
          const selected = index === answer - 1
          return (
            <span
              key={index}
              data-point
              data-selected={String(selected)}
              className={cn(
                "h-3 w-6 rounded-sm",
                selected ? point.className : "bg-muted",
              )}
            />
          )
        })}
      </div>
    </div>
  )
}
