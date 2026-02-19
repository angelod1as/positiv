import { Controller, type Control, type FieldValues, type Path } from "react-hook-form"
import { Error } from "~/components/forms/base/error"
import { Label } from "~/components/ui/label"
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group"

type SingleSelectProps<T extends FieldValues = FieldValues> = {
  name: Path<T> | string
  control: Control<T>
  answers: string[]
  error?: string
}

export const SingleSelect = <T extends FieldValues = FieldValues>({
  name,
  control,
  answers,
  error,
}: SingleSelectProps<T>): React.ReactElement => (
  <Controller
    name={name as Path<T>}
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
              <Label
                key={i}
                htmlFor={radioId}
                className="flex gap-2 self-start cursor-pointer"
              >
                <RadioGroupItem value={answer} id={radioId} />
                <span className="text-base -mt-1">{answer}</span>
              </Label>
            )
          })}
        </RadioGroup>
        {error && <Error name={name}>{error}</Error>}
      </div>
    )}
  />
)
