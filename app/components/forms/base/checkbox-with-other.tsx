import * as React from "react"
import {
  Controller,
  type Control,
  type FieldErrors,
  type FieldValues,
  type Path,
} from "react-hook-form"
import { cn } from "~/lib/utils"
import { Checkbox } from "~/components/ui/checkbox"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Error } from "./error"
import { FormDescription } from "./form-description"

type Option = { label: string; value: string }

interface CheckboxWithOtherProps<TFieldValues extends FieldValues> {
  name: Path<TFieldValues>
  options: Option[]
  className?: string
  control: Control<TFieldValues>
  errors: FieldErrors<TFieldValues>
}

export const CheckboxWithOther = <TFieldValues extends FieldValues>({
  name,
  options,
  className,
  control,
  errors,
}: CheckboxWithOtherProps<TFieldValues>) => {
  const [otherInput, setOtherInput] = React.useState("")
  const otherCheckboxRef = React.useRef<HTMLInputElement>(null)
  const fieldError = errors[name]
  const errorMessage = fieldError?.message as string | undefined

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const selectedValues: string[] = field.value || []

        // Check if any selected value is not in our predefined options
        const otherValues = selectedValues.filter(
          (val) => !options.find((opt) => opt.value === val),
        )
        const isOtherChecked = otherValues.length > 0

        // If we have other values, update the input field
        React.useEffect(() => {
          if (isOtherChecked && otherValues.length > 0) {
            setOtherInput(otherValues.join(", "))
          }
        }, [])

        const handleCheckboxChange =
          (value: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
            const isChecked = e.target.checked
            const nextValues = isChecked
              ? [...selectedValues, value]
              : selectedValues.filter((v) => v !== value)

            field.onChange(nextValues)
          }

        const handleOtherToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
          const isChecked = e.target.checked
          // Keep only known values
          const knownValues = selectedValues.filter((v) =>
            options.some((opt) => opt.value === v),
          )

          if (!isChecked) {
            // Remove all custom values
            setOtherInput("")
            field.onChange(knownValues)
          } else {
            // Add a placeholder value to make it checked while empty
            // This will be replaced when the user types something
            const tempValue = "other"
            field.onChange([...knownValues, tempValue])
            setOtherInput("")
          }
        }

        const handleOtherInput = (e: React.ChangeEvent<HTMLInputElement>) => {
          const value = e.target.value
          setOtherInput(value)

          // Get all known values
          const knownValues = selectedValues.filter((v) =>
            options.some((opt) => opt.value === v),
          )

          // Parse custom values from input
          const customValues = value
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)

          // If there are no custom values but the other checkbox is checked,
          // keep a placeholder to maintain the checked state
          const valueToStore =
            customValues.length > 0 ? customValues : ["other"]

          field.onChange([...knownValues, ...valueToStore])
        }

        return (
          <div className={cn("flex flex-col gap-2", className)}>
            {options.map((option) => (
              <Label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={selectedValues.includes(option.value)}
                  onChange={handleCheckboxChange(option.value)}
                />
                <span>{option.label}</span>
              </Label>
            ))}

            <div className="flex flex-col gap-1 items-start">
              <Label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  ref={otherCheckboxRef}
                  checked={isOtherChecked}
                  onChange={handleOtherToggle}
                />
                <span>Outros</span>
              </Label>
              {isOtherChecked && (
                <>
                  <Input
                    data-testid={`outros-${name}`}
                    type="text"
                    className="input"
                    placeholder="Exemplo 1, Exemplo 2"
                    value={otherInput}
                    onChange={handleOtherInput}
                  />
                  <FormDescription description="Separe múltiplos por vírgula" />
                </>
              )}
            </div>
            {fieldError && <Error>{errorMessage}</Error>}
          </div>
        )
      }}
    />
  )
}
