import type { HTMLInputTypeAttribute, ReactNode } from "react"
import type { FieldError, FieldValues, Path } from "react-hook-form"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { cn } from "~/lib/utils"
import { FormError } from "../form-error/form-error"

type FormInputProps<T extends FieldValues> = {
  id: Path<T>
  type: HTMLInputTypeAttribute
  placeholder: string
  label: string
  className?: string
  errors: FieldError | undefined
  required?: boolean
  /* ReactNode rendered to the right of the label*/
  companion?: ReactNode
}
export const FormInput = <T extends FieldValues>({
  id,
  label,
  className,
  errors,
  companion,
  ...props
}: FormInputProps<T>) => {
  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <div className="text-sm">{companion}</div>
      </div>
      <Input id={id} {...props} />
      {errors && <FormError>{errors.message}</FormError>}
    </div>
  )
}
