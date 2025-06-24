import type { FC } from "react"
import { Controller, type Control } from "react-hook-form"
import { FormError } from "~/components/forms/form-error"
import { Label } from "~/components/ui/label"
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group"
import type { RulesFormData } from "../event-rules-page"

type SingleSelectProps = {
  name: string
  control: Control<RulesFormData>
  answers: string[]
  error?: string
}

export const SingleSelect: FC<SingleSelectProps> = ({
  name,
  control,
  answers,
  error,
}) => (
  <Controller
    name={name}
    control={control}
    render={({ field }) => (
      <div className="flex flex-col gap-2">
        <RadioGroup
          className="flex flex-col gap-4"
          value={field.value}
          onValueChange={field.onChange}
        >
          {answers.map((answer, i) => {
            const radioId = `${name}-${i}`
            return (
              <div key={i} className="flex gap-2 self-start">
                <RadioGroupItem value={answer} id={radioId} className="" />
                <Label className="text-base -mt-1" htmlFor={radioId}>
                  {answer}
                </Label>
              </div>
            )
          })}
        </RadioGroup>
        {error && <FormError name={name}>{error}</FormError>}
      </div>
    )}
  />
)
