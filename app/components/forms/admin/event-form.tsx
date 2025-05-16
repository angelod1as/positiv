import type { FC } from "react"
import type { z } from "zod"
import { eventFormSchema } from "~/business/admin/common"
import { Button } from "~/components/atoms/button/button"
import { Separator } from "~/components/ui/separator"
import { dbValuesToFormSchema } from "~/lib/helpers/db-values-to-form-schema"
import type { Event } from "~types/entities.types"
import { SchemaForm } from "../schema-form"
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
          starting_time: "Início do evento",
          ending_time: "Fim do evento",
          application_open_time: "Abertura",
          application_close_time: "Encerramento",
          interview_process_start: "Abertura",
          interview_process_end: "Encerramento",
          group_open_date: "Início",
          group_close_date: "Encerramento",
          payment_start_date: "Início",
          payment_end_date: "Encerramento",
        }}
        multiline={["description"]}
        inputTypes={{
          ticket_price: "textnumber",
          total_spots: "textnumber",
          starting_time: "datetime-local",
          ending_time: "datetime-local",
          application_open_time: "datetime-local",
          application_close_time: "datetime-local",
          interview_process_start: "datetime-local",
          interview_process_end: "datetime-local",
          group_open_date: "datetime-local",
          group_close_date: "datetime-local",
          payment_start_date: "datetime-local",
          payment_end_date: "datetime-local",
        }}
        descriptions={{
          description: "Use uma frase divertida!",
        }}
        placeholders={{
          title: "Rapa do Tacho",
          description: "Para quem sobreviveu ao carnaval oficial",
          location: "Motel Harmony",
          ticket_price: "200",
          total_spots: "60",
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
            const startingTime = getValues("starting_time")

            if (!startingTime) {
              setError("starting_time", {
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
                  <Field name="starting_time" />
                </div>
                <div className="sm:col-span-6 col-span-12">
                  <Field name="ending_time" />
                </div>

                <h6 className="pt-4 col-span-12">Inscrições</h6>
                <div className="sm:col-span-6 col-span-12">
                  <Field name="application_open_time" />
                </div>
                <div className="sm:col-span-6 col-span-12">
                  <Field name="application_close_time" />
                </div>

                <h6 className="pt-4 col-span-12">Entrevistas</h6>
                <div className="sm:col-span-6 col-span-12">
                  <Field name="interview_process_start" />
                </div>
                <div className="sm:col-span-6 col-span-12">
                  <Field name="interview_process_end" />
                </div>

                <h6 className="pt-4 col-span-12">Grupo</h6>
                <div className="sm:col-span-6 col-span-12">
                  <Field name="group_open_date" />
                </div>
                <div className="sm:col-span-6 col-span-12">
                  <Field name="group_close_date" />
                </div>

                <h6 className="pt-4 col-span-12">Pagamentos</h6>
                <div className="sm:col-span-6 col-span-12">
                  <Field name="payment_start_date" />
                </div>
                <div className="sm:col-span-6 col-span-12">
                  <Field name="payment_end_date" />
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
