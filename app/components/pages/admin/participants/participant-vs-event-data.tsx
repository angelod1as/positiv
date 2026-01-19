import type { FC } from "react"
import { useFetcher } from "react-router"
import { z } from "zod"
import { DataPair } from "~/components/atoms/data-pair/data-pair"
import { Checkbox } from "~/components/ui/checkbox"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { TextArea } from "~/components/ui/textarea"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import {
  applicationStatusOptions,
  attendanceStatusOptions,
  eventParticipantPropMap,
  spotTypeOptions,
} from "~/lib/helpers/propMaps"
import { useAutoSaveForm } from "~/lib/hooks/use-auto-save-form"
import type {
  ComposableFetcherData,
  EventParticipantWithEvent,
} from "~types/database/entities.types"

const eventParticipantFormSchema = z.object({
  attendance_status: z.string(),
  application_status: z.string(),
  spot_type: z.string(),
  payment: z.string(),
  has_paid: z.boolean(),
  was_selected_for_rotation: z.boolean(),
  admin_general_notes: z.string(),
})

type ParticipantVsEventDataProps = {
  eventParticipant: EventParticipantWithEvent
}

export const ParticipantVsEventData: FC<ParticipantVsEventDataProps> = ({
  eventParticipant,
}) => {
  const {
    id,
    event_id,
    profile_id,
    application_date,
    attendance_status,
    application_status,
    spot_type,
    payment,
    has_paid,
    was_selected_for_rotation,
    admin_general_notes,
    bond,
    companions,
    notes,
    referrals,
    referred,
  } = eventParticipant

  const fetcher = useFetcher<ComposableFetcherData>()

  const { values, register } = useAutoSaveForm({
    schema: eventParticipantFormSchema,
    initialData: {
      attendance_status,
      application_status,
      spot_type,
      payment: payment?.toString() ?? "",
      has_paid,
      was_selected_for_rotation,
      admin_general_notes: admin_general_notes ?? "",
    },
    fetcher,
    onSubmit: (field, value) => {
      const formData = new FormData()
      formData.set("intent", "update-event-participant")
      formData.set("id", id)
      formData.set("profile_id", profile_id ?? "")
      formData.set("event_id", event_id)
      formData.set(field, String(value))
      fetcher.submit(formData, { method: "POST" })
    },
  })

  return (
    <div className="space-y-4">
      <h3>Neste evento</h3>
      <div className="space-y-8">
        <div className="space-y-2">
          <h4>Administração</h4>

          <div className="space-y-4">
            <div className="lg:flex gap-4 [&>*]:flex-1">
              <div className="space-y-2">
                <Label htmlFor="attendance_status">Status de Presença</Label>
                <Select {...register.select("attendance_status")}>
                  <SelectTrigger id="attendance_status">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {attendanceStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="application_status">Status de Inscrição</Label>
                <Select {...register.select("application_status")}>
                  <SelectTrigger id="application_status">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {applicationStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="lg:flex gap-4 [&>*]:flex-1">
              <div className="space-y-2">
                <Label htmlFor="spot_type">Tipo de Vaga</Label>
                <Select {...register.select("spot_type")}>
                  <SelectTrigger id="spot_type">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {spotTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment">Pagamento</Label>
                <Input
                  id="payment"
                  type="number"
                  {...register.number("payment")}
                />
              </div>

              <div className="flex flex-col justify-end gap-2">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={values.has_paid}
                    onChange={register.checkbox("has_paid").onChange}
                  />
                  <span>Pago</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={values.was_selected_for_rotation}
                    onChange={
                      register.checkbox("was_selected_for_rotation").onChange
                    }
                  />
                  <span>Selecionado para Rodízio</span>
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin_general_notes">
                Notas Gerais do Evento
              </Label>
              <TextArea
                id="admin_general_notes"
                {...register.text("admin_general_notes")}
                placeholder="Notas administrativas para este evento..."
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4>Respostas</h4>
          <DataPair
            pair={[
              eventParticipantPropMap("application_date"),
              formatDateTime(application_date).full,
            ]}
          />
          <DataPair
            pair={[eventParticipantPropMap("bond"), bond || "não respondeu"]}
          />
          <DataPair
            pair={[
              eventParticipantPropMap("companions"),
              companions || "não respondeu",
            ]}
          />
          <DataPair
            pair={[
              `${eventParticipantPropMap("notes")} (Participante)`,
              notes || "não respondeu",
            ]}
          />
          <DataPair
            pair={[
              eventParticipantPropMap("referrals"),
              referrals || "não respondeu",
            ]}
          />
          <DataPair
            pair={[
              eventParticipantPropMap("referred"),
              referred || "não respondeu",
            ]}
          />
        </div>
      </div>
    </div>
  )
}
