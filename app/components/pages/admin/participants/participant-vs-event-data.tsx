import type { ChangeEvent, FC } from "react"
import { useEffect, useRef, useState } from "react"
import { useFetcher } from "react-router"
import { toast } from "sonner"
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
import type {
  ComposableFetcherData,
  EventParticipantWithEvent,
} from "~types/database/entities.types"

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
  const previousDataRef = useRef<ComposableFetcherData | undefined>(undefined)

  // Local state for all editable fields
  const [localAttendanceStatus, setLocalAttendanceStatus] =
    useState(attendance_status)
  const [localApplicationStatus, setLocalApplicationStatus] =
    useState(application_status)
  const [localSpotType, setLocalSpotType] = useState(spot_type)
  const [localPayment, setLocalPayment] = useState(payment?.toString() ?? "")
  const [localHasPaid, setLocalHasPaid] = useState(has_paid)
  const [localWasSelectedForRotation, setLocalWasSelectedForRotation] =
    useState(was_selected_for_rotation)
  const [localAdminNotes, setLocalAdminNotes] = useState(
    admin_general_notes ?? "",
  )

  // Show toast feedback when fetcher.data changes
  useEffect(() => {
    if (fetcher.data && fetcher.data !== previousDataRef.current) {
      if (fetcher.data.success) {
        toast.success("Dados atualizados com sucesso")
      } else {
        toast.error("Erro ao salvar")
      }
    }
    previousDataRef.current = fetcher.data
  }, [fetcher.data])

  // Sync local state when props change (e.g., after revalidation)
  useEffect(() => {
    setLocalAttendanceStatus(attendance_status)
  }, [attendance_status])

  useEffect(() => {
    setLocalApplicationStatus(application_status)
  }, [application_status])

  useEffect(() => {
    setLocalSpotType(spot_type)
  }, [spot_type])

  useEffect(() => {
    setLocalPayment(payment?.toString() ?? "")
  }, [payment])

  useEffect(() => {
    setLocalHasPaid(has_paid)
  }, [has_paid])

  useEffect(() => {
    setLocalWasSelectedForRotation(was_selected_for_rotation)
  }, [was_selected_for_rotation])

  useEffect(() => {
    setLocalAdminNotes(admin_general_notes ?? "")
  }, [admin_general_notes])

  const submitField = (field: string, value: unknown) => {
    const formData = new FormData()
    formData.set("intent", "update-event-participant")
    formData.set("id", id)
    formData.set("profile_id", profile_id ?? "")
    formData.set("event_id", event_id)
    formData.set(field, String(value))

    fetcher.submit(formData, { method: "POST" })
  }

  const handleAttendanceStatusChange = (value: string) => {
    setLocalAttendanceStatus(value as typeof attendance_status)
    submitField("attendance_status", value)
  }

  const handleApplicationStatusChange = (value: string) => {
    setLocalApplicationStatus(value as typeof application_status)
    submitField("application_status", value)
  }

  const handleSpotTypeChange = (value: string) => {
    setLocalSpotType(value as typeof spot_type)
    submitField("spot_type", value)
  }

  const handleHasPaidChange = (e: ChangeEvent<HTMLInputElement>) => {
    setLocalHasPaid(e.target.checked)
    submitField("has_paid", e.target.checked)
  }

  const handleWasSelectedForRotationChange = (
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    setLocalWasSelectedForRotation(e.target.checked)
    submitField("was_selected_for_rotation", e.target.checked)
  }

  const handleTextBlur = (
    field: string,
    value: string,
    originalValue: string | number | null,
  ) => {
    if (value !== (originalValue?.toString() ?? "")) {
      submitField(field, value)
    }
  }

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
                <Select
                  value={localAttendanceStatus}
                  onValueChange={handleAttendanceStatusChange}
                >
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
                <Select
                  value={localApplicationStatus}
                  onValueChange={handleApplicationStatusChange}
                >
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
                <Select
                  value={localSpotType}
                  onValueChange={handleSpotTypeChange}
                >
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
                  value={localPayment}
                  onChange={(e) => setLocalPayment(e.target.value)}
                  onBlur={(e) =>
                    handleTextBlur("payment", e.target.value, payment)
                  }
                />
              </div>

              <div className="flex flex-col justify-end gap-2">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={localHasPaid}
                    onChange={handleHasPaidChange}
                  />
                  <span>Pago</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={localWasSelectedForRotation}
                    onChange={handleWasSelectedForRotationChange}
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
                value={localAdminNotes}
                onChange={(e) => setLocalAdminNotes(e.target.value)}
                onBlur={(e) =>
                  handleTextBlur(
                    "admin_general_notes",
                    e.target.value,
                    admin_general_notes,
                  )
                }
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
