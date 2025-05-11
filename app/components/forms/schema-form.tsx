import {
  SchemaForm as BaseForm,
  type FormSchema,
  type SchemaFormProps as RemixFormsSchemaProps,
} from "remix-forms"

import type { z } from "zod"
import { Checkbox } from "../ui/checkbox"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { RadioGroup } from "../ui/radio-group"
import { TextArea } from "../ui/textarea"
import { Error } from "./error"
import { Errors } from "./errors"
import { Field } from "./field"
import { FormDescription } from "./form-description"
import { InputWrapper } from "./input-wrapper"
import { Radio } from "./radio"
import { Select } from "./select"
import { SubmitButton } from "./submit-button"

type FormValues<SchemaType> = Partial<Record<keyof SchemaType, string>>

type SchemaFormExtraProps<Schema extends FormSchema> = {
  descriptions?: FormValues<z.infer<Schema>>
}
type SchemaFormProps<Schema extends FormSchema> =
  RemixFormsSchemaProps<Schema> & SchemaFormExtraProps<Schema>

function SchemaForm<Schema extends FormSchema>({
  descriptions,
  className,
  ...props
}: SchemaFormProps<Schema>) {
  return (
    <>
      <BaseForm
        className="flex flex-col gap-8"
        fieldComponent={Field}
        labelComponent={Label}
        inputComponent={Input}
        multilineComponent={TextArea}
        selectComponent={Select}
        radioComponent={Radio}
        radioGroupComponent={RadioGroup}
        radioWrapperComponent={InputWrapper}
        checkboxComponent={Checkbox}
        buttonComponent={SubmitButton}
        globalErrorsComponent={Errors}
        errorComponent={Error}
        buttonLabel="Continuar"
        pendingButtonLabel="Carregando..."
        {...props}
        renderField={({ Field, fieldType, ...props }) => {
          const { name } = props

          return (
            <Field key={name.toString()} {...props}>
              {({ Label, SmartInput, Checkbox, type, Errors }) => {
                if (type === "checkbox") {
                  return (
                    <div className="flex gap-2 items-start">
                      <Checkbox />
                      <div>
                        <Label className="text-muted-foreground" />
                        <FormDescription description={descriptions?.[name]} />
                        <Errors />
                      </div>
                    </div>
                  )
                }

                return (
                  <>
                    <div>
                      <Label className="text-muted-foreground" />
                      <FormDescription description={descriptions?.[name]} />
                    </div>

                    {type === "textnumber" ? (
                      <SmartInput
                        type="number"
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    ) : (
                      <SmartInput />
                    )}

                    <Errors />
                  </>
                )
              }}
            </Field>
          )
        }}
      />
    </>
  )
}

export { SchemaForm }
