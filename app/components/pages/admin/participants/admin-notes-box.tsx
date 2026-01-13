import type { ChangeEvent, FC } from "react"
import { useFetcher } from "react-router"
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
import type { ProfileFlagStatus } from "~types/database/entities.types"

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
  const fetcher = useFetcher()

  const handleFieldChange = (field: string, value: unknown) => {
    const formData = new FormData()
    formData.set("intent", "update-profile-admin-notes")
    formData.set("profile_id", profileId)
    formData.set(field, String(value))

    fetcher.submit(formData, { method: "POST" })
  }

  return (
    <Card className="py-4">
      <CardContent>
        <h3 className="mb-4">Em toda a Positiv</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="flag">Flag</Label>
            <Select
              value={flag}
              onValueChange={(value) => handleFieldChange("flag", value)}
            >
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
              value={flagNotes ?? ""}
              onChange={(e) => handleFieldChange("flag_notes", e.target.value)}
              onBlur={(e) => handleFieldChange("flag_notes", e.target.value)}
              placeholder="Notas sobre a flag..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="general_notes">Notas Gerais</Label>
            <TextArea
              id="general_notes"
              value={generalNotes ?? ""}
              onChange={(e) =>
                handleFieldChange("general_notes", e.target.value)
              }
              onBlur={(e) => handleFieldChange("general_notes", e.target.value)}
              placeholder="Notas gerais sobre o perfil..."
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_veteran"
              checked={isVeteran}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleFieldChange("is_veteran", e.target.checked)
              }
            />
            <Label htmlFor="is_veteran">Veterano</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
