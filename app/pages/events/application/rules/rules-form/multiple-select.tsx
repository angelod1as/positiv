import type { FC } from "react"
import { Controller, type Control } from "react-hook-form"
import { FormError } from "~/components/forms/form-error"
import { Checkbox } from "~/components/ui/checkbox"
import { Label } from "~/components/ui/label"
import type { RulesFormData } from "../event-rules-page"

type MultipleSelectProps = {
  name: string
  control: Control<RulesFormData>
  answers: string[]
  error?: string
}

export const MultipleSelect: FC<MultipleSelectProps> = ({
  answers,
  control,
  name,
  error,
}) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className="flex flex-col gap-4">
          {answers.map((answer, i) => {
            const isChecked = field.value?.includes(answer) || false
            const checkboxId = `${name}-${i}`

            return (
              <div key={i} className="flex gap-2">
                <Checkbox
                  id={checkboxId}
                  checked={isChecked}
                  onChange={(e) => {
                    const newValue = e.target.checked
                      ? [...(field.value || []), answer]
                      : (field.value || []).filter((v: string) => v !== answer)
                    field.onChange(newValue)
                  }}
                />
                <Label className="text-base -mt-0.5" htmlFor={checkboxId}>
                  {answer}
                </Label>
              </div>
            )
          })}
          {error && <FormError name={name}>{error}</FormError>}
        </div>
      )}
    />
  )
}
