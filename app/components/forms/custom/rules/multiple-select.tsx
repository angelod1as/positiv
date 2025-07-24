import { Controller, type Control, type FieldValues, type Path } from "react-hook-form"
import { Error } from "~/components/forms/base/error"
import { Checkbox } from "~/components/ui/checkbox"
import { Label } from "~/components/ui/label"

type MultipleSelectProps<T extends FieldValues = FieldValues> = {
  name: Path<T> | string
  control: Control<T>
  answers: string[]
  error?: string
}

export const MultipleSelect = <T extends FieldValues = FieldValues>({
  answers,
  control,
  name,
  error,
}: MultipleSelectProps<T>): React.ReactElement => {
  return (
    <Controller
      name={name as Path<T>}
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
          {error && <Error name={name}>{error}</Error>}
        </div>
      )}
    />
  )
}
