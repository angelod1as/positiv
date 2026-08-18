import type { ChangeEvent, FC } from "react"
import { useEffect, useRef } from "react"
import { useFetcher } from "react-router"
import { toast } from "sonner"
import { Card, CardContent } from "~/components/ui/card"
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
import { flagStatusOptions } from "~/lib/helpers/propMaps"
import { useSyncedState } from "~/lib/hooks/use-synced-state"
import type {
  ComposableFetcherData,
  ProfileFlagStatus,
} from "~types/database/entities.types"

const notesCopy = adminParticipantsCopy.adminNotes

type AdminNotesBoxProps = {
  profileId: string
  flag: ProfileFlagStatus
  flagNotes: string | null
  generalNotes: string | null
  isVeteran: boolean
}

export const AdminNotesBox: FC<AdminNotesBoxProps> = ({
  profileId,
  flag,
  flagNotes,
  generalNotes,
  isVeteran,
}) => {
  const fetcher = useFetcher<ComposableFetcherData>()
  const previousDataRef = useRef<ComposableFetcherData | undefined>(undefined)

  // Local state for text inputs, synced with props
  const [localFlagNotes, setLocalFlagNotes] = useSyncedState(flagNotes ?? "")
  const [localGeneralNotes, setLocalGeneralNotes] = useSyncedState(
    generalNotes ?? "",
  )

  // Show toast feedback when fetcher.data changes
  useEffect(() => {
    if (fetcher.data && fetcher.data !== previousDataRef.current) {
      if (fetcher.data.success) {
        toast.success(notesCopy.saved)
      } else {
        const errorMessage =
          fetcher.data.errors?._global?.[0] ?? notesCopy.saveFailed
        toast.error(errorMessage)
      }
    }
    previousDataRef.current = fetcher.data
  }, [fetcher.data])

  const submitField = (
    field: string,
    value: unknown,
    additionalFields?: Record<string, string>,
  ) => {
    const formData = new FormData()
    formData.set("intent", "update-profile-admin-notes")
    formData.set("profile_id", profileId)
    formData.set(field, String(value))

    if (additionalFields) {
      Object.entries(additionalFields).forEach(([key, val]) => {
        formData.set(key, val)
      })
    }

    fetcher.submit(formData, { method: "POST" })
  }

  const handleFlagChange = (newFlag: string) => {
    // If changing to a non-"none" flag, validate flag_notes
    if (newFlag !== "none") {
      if (!localFlagNotes.trim()) {
        toast.warning(notesCopy.flagNotesRequired)
        return
      }
      // Submit both flag and flag_notes when setting a non-none flag
      submitField("flag", newFlag, { flag_notes: localFlagNotes })
    } else {
      // When setting to "none", just submit the flag
      submitField("flag", newFlag)
    }
  }

  const handleTextBlur = (
    field: string,
    value: string,
    originalValue: string | null,
  ) => {
    // Prevent clearing flag_notes when a flag is set
    if (field === "flag_notes" && flag !== "none" && !value.trim()) {
      toast.warning(notesCopy.flagNotesEmpty)
      setLocalFlagNotes(originalValue ?? "")
      return
    }

    // Only submit if value actually changed
    if (value !== (originalValue ?? "")) {
      submitField(field, value)
    }
  }

  return (
    <Card className="py-4">
      <CardContent>
        <h3 className="mb-4">{notesCopy.title}</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="flag">{notesCopy.flag}</Label>
            <Select value={flag} onValueChange={handleFlagChange}>
              <SelectTrigger id="flag">
                <SelectValue placeholder={notesCopy.flagPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {flagStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="flag_notes">{notesCopy.flagNotes}</Label>
            <TextArea
              id="flag_notes"
              value={localFlagNotes}
              onChange={(e) => setLocalFlagNotes(e.target.value)}
              onBlur={(e) =>
                handleTextBlur("flag_notes", e.target.value, flagNotes)
              }
              placeholder={notesCopy.flagNotesPlaceholder}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="general_notes">{notesCopy.generalNotes}</Label>
            <TextArea
              id="general_notes"
              value={localGeneralNotes}
              onChange={(e) => setLocalGeneralNotes(e.target.value)}
              onBlur={(e) =>
                handleTextBlur("general_notes", e.target.value, generalNotes)
              }
              placeholder={notesCopy.generalNotesPlaceholder}
            />
          </div>

          <Label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={isVeteran}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                submitField("is_veteran", e.target.checked)
              }
            />
            <span>{notesCopy.veteran}</span>
          </Label>
        </div>
      </CardContent>
    </Card>
  )
}
