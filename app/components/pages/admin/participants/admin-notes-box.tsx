import type { ChangeEvent, FC } from "react"
import { useEffect, useRef, useState } from "react"
import { useFetcher } from "react-router"
import { toast } from "sonner"
import { Card, CardContent } from "~/components/ui/card"
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
import type {
  ComposableFetcherData,
  ProfileFlagStatus,
} from "~types/database/entities.types"

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

  // Local state for text inputs to avoid submitting on every keystroke
  const [localFlagNotes, setLocalFlagNotes] = useState(flagNotes ?? "")
  const [localGeneralNotes, setLocalGeneralNotes] = useState(generalNotes ?? "")

  // Show toast feedback when fetcher.data changes
  useEffect(() => {
    if (fetcher.data && fetcher.data !== previousDataRef.current) {
      if (fetcher.data.success) {
        toast.success("Dados salvos com sucesso")
      } else {
        toast.error("Erro ao salvar")
      }
    }
    previousDataRef.current = fetcher.data
  }, [fetcher.data])

  // Sync local state when props change (e.g., after revalidation)
  useEffect(() => {
    setLocalFlagNotes(flagNotes ?? "")
  }, [flagNotes])

  useEffect(() => {
    setLocalGeneralNotes(generalNotes ?? "")
  }, [generalNotes])

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
        toast.warning(
          "Notas da Flag são obrigatórias quando uma flag é selecionada",
        )
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
    // Only submit if value actually changed
    if (value !== (originalValue ?? "")) {
      submitField(field, value)
    }
  }

  return (
    <Card className="py-4">
      <CardContent>
        <h3 className="mb-4">Em toda a Positiv</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="flag">Flag</Label>
            <Select value={flag} onValueChange={handleFlagChange}>
              <SelectTrigger id="flag">
                <SelectValue placeholder="Selecione uma flag" />
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
            <Label htmlFor="flag_notes">Notas da Flag</Label>
            <TextArea
              id="flag_notes"
              value={localFlagNotes}
              onChange={(e) => setLocalFlagNotes(e.target.value)}
              onBlur={(e) =>
                handleTextBlur("flag_notes", e.target.value, flagNotes)
              }
              placeholder="Notas sobre a flag..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="general_notes">Notas Gerais</Label>
            <TextArea
              id="general_notes"
              value={localGeneralNotes}
              onChange={(e) => setLocalGeneralNotes(e.target.value)}
              onBlur={(e) =>
                handleTextBlur("general_notes", e.target.value, generalNotes)
              }
              placeholder="Notas gerais sobre o perfil..."
            />
          </div>

          <Label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={isVeteran}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                submitField("is_veteran", e.target.checked)
              }
            />
            <span>Veterano</span>
          </Label>
        </div>
      </CardContent>
    </Card>
  )
}
