import type { FC } from "react"
import type { z } from "zod"
import { eventFormSchema } from "~/business/admin/common"
import { Button } from "~/components/atoms/button/button"
import { Separator } from "~/components/ui/separator"
import { dbValuesToFormSchema } from "~/lib/helpers/db-values-to-form-schema"
import type { Event } from "~types/database/entities.types"
import { SchemaForm } from "../base/schema-form"
import { calculateDerivedDates } from "./calculate-derived-dates"

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
        labels={{
          title: "Nome da festa",
          emoji: "Emoji",
          description: "Descrição",
          location: "Local",
          ticket_price: "Valor",
          total_spots: "Lotação",
          event_type: "Tipo de evento",
          time_event_start: "Início do evento",
          time_event_end: "Fim do evento",
          time_application_start: "Abertura",
          time_application_end: "Encerramento",
          time_interviews_start: "Abertura",
          time_interviews_end: "Encerramento",
          time_group_start: "Início",
          time_group_end: "Encerramento",
          time_payment_start: "Início",
          time_payment_end: "Encerramento",
        }}
        multiline={["description"]}
        inputTypes={{
          ticket_price: "textnumber",
          total_spots: "textnumber",
          event_type: "select",
          time_event_start: "datetime-local",
          time_event_end: "datetime-local",
          time_application_start: "datetime-local",
          time_application_end: "datetime-local",
          time_interviews_start: "datetime-local",
          time_interviews_end: "datetime-local",
          time_group_start: "datetime-local",
          time_group_end: "datetime-local",
          time_payment_end: "datetime-local",
          time_payment_start: "datetime-local",
        }}
        descriptions={{
          description: "Use uma frase divertida!",
          event_type: "Edições BDSM têm uma página de consentimento adicional",
        }}
        placeholders={{
          title: "Rapa do Tacho",
          description: "Para quem sobreviveu ao carnaval oficial",
          location: "Motel Harmony",
          ticket_price: "200",
          total_spots: "60",
        }}
        options={{
          event_type: [
            { value: "regular", name: "Regular" },
            { value: "bdsm", name: "BDSM" },
          ],
        }}
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
                message: "Você deve preencher a data de início",
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
                <h5 className="pt-4 col-span-12">Dados gerais</h5>
                <div className="sm:col-span-9 col-span-12">
                  <Field name="title" />
                </div>
                <div className="sm:col-span-3 col-span-12">
                  <Field name="emoji" />
                </div>
                <div className="sm:col-span-12 col-span-12">
                  <Field name="description" description="Use uma frase breve" />
                </div>
                <div className="sm:col-span-7 col-span-12">
                  <Field name="location" />
                </div>
                <div className="sm:col-span-2 col-span-12">
                  <Field name="ticket_price" prefix="R$" type="number" />
                </div>
                <div className="sm:col-span-3 col-span-12">
                  <Field name="total_spots" suffix="pessoas" type="number" />
                </div>
                <div className="sm:col-span-12 col-span-12">
                  <Field name="event_type" />
                </div>

                <div className="col-span-12">
                  <Separator className="mt-8" />
                </div>

                <div className="pt-4 col-span-12 flex justify-between items-baseline mb-4">
                  <h5>Datas</h5>
                  <Button
                    type="button"
                    onClick={() => handleDates()}
                    variant="default"
                  >
                    Calcular datas automaticamente
                  </Button>
                </div>

                <div className="sm:col-span-6 col-span-12">
                  <Field name="time_event_start" />
                </div>
                <div className="sm:col-span-6 col-span-12">
                  <Field name="time_event_end" />
                </div>

                <h6 className="pt-4 col-span-12">Inscrições</h6>
                <div className="sm:col-span-6 col-span-12">
                  <Field name="time_application_start" />
                </div>
                <div className="sm:col-span-6 col-span-12">
                  <Field name="time_application_end" />
                </div>

                <h6 className="pt-4 col-span-12">Entrevistas</h6>
                <div className="sm:col-span-6 col-span-12">
                  <Field name="time_interviews_start" />
                </div>
                <div className="sm:col-span-6 col-span-12">
                  <Field name="time_interviews_end" />
                </div>

                <h6 className="pt-4 col-span-12">Grupo</h6>
                <div className="sm:col-span-6 col-span-12">
                  <Field name="time_group_start" />
                </div>
                <div className="sm:col-span-6 col-span-12">
                  <Field name="time_group_end" />
                </div>

                <h6 className="pt-4 col-span-12">Pagamentos</h6>
                <div className="sm:col-span-6 col-span-12">
                  <Field name="time_payment_start" />
                </div>
                <div className="sm:col-span-6 col-span-12">
                  <Field name="time_payment_end" />
                </div>
              </div>
              <Errors />
              <SubmitButton className="w-full">Salvar</SubmitButton>
            </>
          )
        }}
      </SchemaForm>
    </div>
  )
}
