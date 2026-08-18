import type { FC } from "react"
import type { z } from "zod"
import { eventFormSchema } from "~/business/admin/common"
import { Button } from "~/components/atoms/button/button"
import { Separator } from "~/components/ui/separator"
import { adminEventsCopy } from "~/copy/admin/events"
import { dbValuesToFormSchema } from "~/lib/helpers/db-values-to-form-schema"
import type { Event } from "~types/database/entities.types"
import { SchemaForm } from "../base/schema-form"
import { calculateDerivedDates } from "./calculate-derived-dates"

const formCopy = adminEventsCopy.form

type EventFormProps = {
  event?: Event
}

export const EventForm: FC<EventFormProps> = ({ event }) => {
  const formattedDateEvent = event?.id ? dbValuesToFormSchema(event) : event

  return (
    <div>
      <SchemaForm
        schema={eventFormSchema}
        values={formattedDateEvent}
        hiddenFields={["id"]}
        labels={formCopy.labels}
        multiline={["description"]}
        inputTypes={{
          ticket_price: "textnumber",
          total_spots: "textnumber",
          auto_publish: "checkbox",
          time_event_start: "datetime-local",
          time_event_end: "datetime-local",
          time_application_start: "datetime-local",
          time_group_start: "datetime-local",
          time_group_end: "datetime-local",
          time_payment_end: "datetime-local",
          time_payment_start: "datetime-local",
        }}
        descriptions={formCopy.descriptions}
        placeholders={formCopy.placeholders}
      >
        {({
          Field,
          Button: SubmitButton,
          Errors,
          clearErrors,
          getValues,
          setError,
          setValue,
        }) => {
          const handleDates = () => {
            clearErrors()
            const startingTime = getValues("time_event_start")

            if (!startingTime) {
              setError("time_event_start", {
                message: formCopy.startDateRequired,
                type: "value",
              })
              return
            }

            const derivedDates = calculateDerivedDates(startingTime)

            if (derivedDates) {
              Object.entries(derivedDates).forEach(([key, value]) => {
                setValue(key as keyof z.infer<typeof eventFormSchema>, value, {
                  shouldValidate: true,
                })
              })
            }
          }

          return (
            <>
              <div className="grid grid-cols-12 gap-x-4 gap-y-2 grid-flow-row">
                <h5 className="pt-4 col-span-12">{formCopy.sections.generalData}</h5>
                <div className="sm:col-span-9 col-span-12">
                  <Field name="title" />
                </div>
                <div className="sm:col-span-3 col-span-12">
                  <Field name="emoji" />
                </div>
                <div className="sm:col-span-12 col-span-12">
                  <Field name="description" description={formCopy.descriptionHint} />
                </div>
                <div className="sm:col-span-7 col-span-12">
                  <Field name="location" />
                </div>
                <div className="sm:col-span-2 col-span-12">
                  <Field
                    name="ticket_price"
                    prefix={formCopy.ticketPricePrefix}
                    type="number"
                  />
                </div>
                <div className="sm:col-span-3 col-span-12">
                  <Field
                    name="total_spots"
                    suffix={formCopy.totalSpotsSuffix}
                    type="number"
                  />
                </div>
                <div className="sm:col-span-12 col-span-12">
                  <Field name="auto_publish" />
                </div>

                <div className="col-span-12">
                  <Separator className="mt-8" />
                </div>

                <div className="pt-4 col-span-12 flex justify-between items-baseline mb-4">
                  <h5>{formCopy.sections.dates}</h5>
                  <Button
                    type="button"
                    onClick={() => handleDates()}
                    variant="default"
                  >
                    {formCopy.calculateDates}
                  </Button>
                </div>

                <div className="sm:col-span-6 col-span-12">
                  <Field name="time_event_start" />
                </div>
                <div className="sm:col-span-6 col-span-12">
                  <Field name="time_event_end" />
                </div>

                <h6 className="pt-4 col-span-12">{formCopy.sections.applications}</h6>
                <div className="sm:col-span-6 col-span-12">
                  <Field name="time_application_start" />
                </div>

                <h6 className="pt-4 col-span-12">{formCopy.sections.group}</h6>
                <div className="sm:col-span-6 col-span-12">
                  <Field name="time_group_start" />
                </div>
                <div className="sm:col-span-6 col-span-12">
                  <Field name="time_group_end" />
                </div>

                <h6 className="pt-4 col-span-12">{formCopy.sections.payments}</h6>
                <div className="sm:col-span-6 col-span-12">
                  <Field name="time_payment_start" />
                </div>
                <div className="sm:col-span-6 col-span-12">
                  <Field name="time_payment_end" />
                </div>
              </div>
              <Errors />
              <SubmitButton className="w-full">{formCopy.submit}</SubmitButton>
            </>
          )
        }}
      </SchemaForm>
    </div>
  )
}
