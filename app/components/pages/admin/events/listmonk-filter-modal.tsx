import type { FetcherWithComponents } from "react-router"
import { useEffect, useState } from "react"
import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Label } from "~/components/ui/label"
import {
  approvedToAttendStatusOptions,
  applicationStatusOptions,
  attendanceStatusOptions,
} from "~/lib/helpers/propMaps"
import type {
  ParticipantApplicationStatus,
  ParticipantAttendanceStatus,
  ProfileApprovedToAttendStatus,
} from "~/types/database/entities.types"

interface ListmonkFilterModalProps {
  isOpen: boolean
  onClose: () => void
  fetcher: FetcherWithComponents<unknown>
  hasExistingList: boolean
}

const DEFAULT_APPROVAL_STATUSES: ProfileApprovedToAttendStatus[] = [
  "pending",
  "approved",
  "approved_with_reservations",
]

const DEFAULT_APPLICATION_STATUSES: ParticipantApplicationStatus[] = [
  "pending",
  "talking",
  "sent_payment_data",
  "sent_rules",
  "think_better",
  "finalised",
]

const DEFAULT_ATTENDANCE_STATUSES: ParticipantAttendanceStatus[] = [
  "pending",
  "attended",
  "not-attended",
  "skipped",
  "will-not-go",
]

export function ListmonkFilterModal({
  isOpen,
  onClose,
  fetcher,
  hasExistingList,
}: ListmonkFilterModalProps) {
  const [approvalStatuses, setApprovalStatuses] = useState<
    ProfileApprovedToAttendStatus[]
  >(DEFAULT_APPROVAL_STATUSES)
  const [applicationStatuses, setApplicationStatuses] = useState<
    ParticipantApplicationStatus[]
  >(DEFAULT_APPLICATION_STATUSES)
  const [attendanceStatuses, setAttendanceStatuses] = useState<
    ParticipantAttendanceStatus[]
  >(DEFAULT_ATTENDANCE_STATUSES)

  useEffect(() => {
    if (isOpen) {
      setApprovalStatuses(DEFAULT_APPROVAL_STATUSES)
      setApplicationStatuses(DEFAULT_APPLICATION_STATUSES)
      setAttendanceStatuses(DEFAULT_ATTENDANCE_STATUSES)
    }
  }, [isOpen])

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      onClose()
    }
  }, [fetcher.state, fetcher.data, onClose])

  const handleApprovalToggle = (value: ProfileApprovedToAttendStatus) => {
    setApprovalStatuses((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  const handleApplicationToggle = (value: ParticipantApplicationStatus) => {
    setApplicationStatuses((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  const handleAttendanceToggle = (value: ParticipantAttendanceStatus) => {
    setAttendanceStatuses((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  const handleSubmit = () => {
    const formData = new FormData()
    formData.append("intent", "sync-listmonk-list")

    approvalStatuses.forEach((status) => {
      formData.append("approvalStatuses", status)
    })

    applicationStatuses.forEach((status) => {
      formData.append("applicationStatuses", status)
    })

    attendanceStatuses.forEach((status) => {
      formData.append("attendanceStatuses", status)
    })

    fetcher.submit(formData, { method: "POST" })
  }

  const isSubmitting = fetcher.state === "submitting"

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[80vh] overflow-y-auto"
        onEscapeKeyDown={(e) => {
          e.preventDefault()
          onClose()
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {hasExistingList
              ? "Atualizar lista da newsletter"
              : "Criar lista da newsletter"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Status de Aprovação
            </Label>
            <div className="ml-4 space-y-3">
              {approvedToAttendStatusOptions.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`approval-${option.value}`}
                    checked={approvalStatuses.includes(option.value)}
                    onChange={() => handleApprovalToggle(option.value)}
                    aria-label={`Status de Aprovação: ${option.name}`}
                  />
                  <Label
                    htmlFor={`approval-${option.value}`}
                    className="cursor-pointer font-normal"
                  >
                    {option.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Status de Processo
            </Label>
            <div className="ml-4 space-y-3">
              {applicationStatusOptions.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`application-${option.value}`}
                    checked={applicationStatuses.includes(option.value)}
                    onChange={() =>
                      handleApplicationToggle(option.value)
                    }
                    aria-label={`Status de Processo: ${option.name}`}
                  />
                  <Label
                    htmlFor={`application-${option.value}`}
                    className="cursor-pointer font-normal"
                  >
                    {option.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Status de Presença
            </Label>
            <div className="ml-4 space-y-3">
              {attendanceStatusOptions.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`attendance-${option.value}`}
                    checked={attendanceStatuses.includes(option.value)}
                    onChange={() => handleAttendanceToggle(option.value)}
                    aria-label={`Status de Presença: ${option.name}`}
                  />
                  <Label
                    htmlFor={`attendance-${option.value}`}
                    className="cursor-pointer font-normal"
                  >
                    {option.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Sincronizando..." : "Sincronizar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
