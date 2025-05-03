import {
  SchemaForm as BaseForm,
  type FormSchema,
  type SchemaFormProps as RemixFormsSchemaProps,
} from "remix-forms"
import { Checkbox } from "./checkbox"
import { Error } from "./error"
import { Errors } from "./errors"
import { Field } from "./field"
import { Input } from "./input"
import { Label } from "./label"
import { Radio } from "./radio"
import { Select } from "./select"
import { SubmitButton } from "./submit-button"

import { InputWrapper } from "./input-wrapper"
import { RadioGroup } from "./radio-group"

import type { z } from "zod"
import { CheckboxWithOther } from "./checkbox-with-other"
import { TextArea } from "./text-area"

type FormValues<SchemaType> = Partial<Record<keyof SchemaType, string>>

type SchemaFormExtraProps<Schema extends FormSchema> = {
  descriptions?: FormValues<z.infer<Schema>>
}
type SchemaFormProps<Schema extends FormSchema> =
  RemixFormsSchemaProps<Schema> & SchemaFormExtraProps<Schema>

function SchemaForm<Schema extends FormSchema>({
  descriptions,
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
        checkboxWrapperComponent={InputWrapper}
        checkboxComponent={Checkbox}
        buttonComponent={SubmitButton}
        globalErrorsComponent={Errors}
        errorComponent={Error}
        renderField={({ Field, fieldType, ...props }) => {
          const { name } = props

          return (
            <Field key={name.toString()} {...props}>
              {({ Label, SmartInput, options, type, Errors }) => {
                return (
                  <>
                    <div>
                      <Label className="text-muted-foreground" />
                      {descriptions?.[name] && (
                        <p className="text-xs text-muted-foreground">
                          {descriptions[name]}
                        </p>
                      )}
                    </div>

                    {type === "textnumber" ? (
                      <SmartInput
                        type="number"
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    ) : type === "checkbox-with-other" && options ? (
                      // TODO: Not working
                      <CheckboxWithOther name={name.toString()} />
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
        {...props}
      />
    </>
  )
}

export { SchemaForm }
