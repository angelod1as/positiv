import type { FC } from "react"
import { useFetcher } from "react-router"
import { z } from "zod"
import { DataPair } from "~/components/atoms/data-pair/data-pair"
import { adminParticipantsCopy } from "~/copy/admin/participants"
import { Checkbox } from "~/components/ui/checkbox"
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
import { formatCurrency } from "~/lib/helpers/format-currency"
import { isSettledPayment } from "~/lib/helpers/payment-status"
import {
  applicationStatusOptions,
  attendanceStatusOptions,
  eventParticipantPropMap,
  paymentStatusPropMap,
  spotTypeOptions,
} from "~/lib/helpers/propMaps"
import { useAutoSaveForm } from "~/lib/hooks/use-auto-save-form"
import type {
  ComposableFetcherData,
  EventParticipantWithEvent,
} from "~types/database/entities.types"

const vsEventCopy = adminParticipantsCopy.vsEvent

const eventParticipantFormSchema = z.object({
  attendance_status: z.string(),
  application_status: z.string(),
  spot_type: z.string(),
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
    paid_gross,
    refunded,
    payment_status,
    was_selected_for_rotation,
    admin_general_notes,
    bond,
    companions,
    notes,
    referrals,
    referred,
  } = eventParticipant

  const fetcher = useFetcher<ComposableFetcherData>()

  const { register } = useAutoSaveForm({
    schema: eventParticipantFormSchema,
    initialData: {
      attendance_status,
      application_status,
      spot_type,
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
      <h3>{vsEventCopy.title}</h3>
      <div className="space-y-8">
        <div className="space-y-2">
          <h4>{vsEventCopy.administration}</h4>

          <div className="space-y-4">
            <div className="lg:flex gap-4 [&>*]:flex-1">
              <div className="space-y-2">
                <Label htmlFor="attendance_status">{vsEventCopy.attendanceStatus}</Label>
                <Select {...register.select("attendance_status")}>
                  <SelectTrigger id="attendance_status">
                    <SelectValue placeholder={vsEventCopy.selectPlaceholder} />
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
                <Label htmlFor="application_status">
                  {vsEventCopy.applicationStatus}
                </Label>
                <Select {...register.select("application_status")}>
                  <SelectTrigger id="application_status">
                    <SelectValue placeholder={vsEventCopy.selectPlaceholder} />
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
                <Label htmlFor="spot_type">{vsEventCopy.spotType}</Label>
                <Select {...register.select("spot_type")}>
                  <SelectTrigger id="spot_type">
                    <SelectValue placeholder={vsEventCopy.selectPlaceholder} />
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
                <span className="text-sm font-medium">
                  {vsEventCopy.payment}
                </span>
                <p>
                  {payment_status === null
                    ? vsEventCopy.noPayment
                    : `${paymentStatusPropMap(payment_status)}${
                        isSettledPayment(payment_status)
                          ? `${vsEventCopy.paymentSeparator}${formatCurrency(paid_gross - refunded)}`
                          : ""
                      }`}
                </p>
              </div>

              <div className="flex flex-col justify-end gap-2">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox {...register.checkbox("was_selected_for_rotation")} />
                  <span>{vsEventCopy.rotation}</span>
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin_general_notes">
                {vsEventCopy.adminNotes}
              </Label>
              <TextArea
                id="admin_general_notes"
                {...register.text("admin_general_notes")}
                placeholder={vsEventCopy.adminNotesPlaceholder}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4>{vsEventCopy.answers}</h4>
          <DataPair
            pair={[
              eventParticipantPropMap("application_date"),
              formatDateTime(application_date).full,
            ]}
          />
          <DataPair
            pair={[eventParticipantPropMap("bond"), bond || vsEventCopy.noAnswer]}
          />
          <DataPair
            pair={[
              eventParticipantPropMap("companions"),
              companions || vsEventCopy.noAnswer,
            ]}
          />
          <DataPair
            pair={[
              vsEventCopy.participantNotes(eventParticipantPropMap("notes")),
              notes || vsEventCopy.noAnswer,
            ]}
          />
          <DataPair
            pair={[
              eventParticipantPropMap("referrals"),
              referrals || vsEventCopy.noAnswer,
            ]}
          />
          <DataPair
            pair={[
              eventParticipantPropMap("referred"),
              referred || vsEventCopy.noAnswer,
            ]}
          />
        </div>
      </div>
    </div>
  )
}
