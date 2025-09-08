import { type FC, useMemo } from "react"
import type { SegmentFilter } from "~/business/admin/newsletter/newsletter-schema"
import { Label } from "~/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Checkbox } from "~/components/ui/checkbox"

interface RecipientPreview {
  id: string
  email: string
  full_name: string | null
}

interface SegmentSelectorProps {
  value: SegmentFilter
  onChange: (value: SegmentFilter) => void
  recipientCount?: number
  isLoadingCount?: boolean
  recipientPreview?: RecipientPreview[]
}

type SegmentType = 
  | "all"
  | "admins"
  | "veterans"
  | "newbies"
  | "new_registrations_30d"
  | "applied_never_attended"

const SEGMENT_OPTIONS: { value: SegmentType; label: string; description: string }[] = [
  { value: "all", label: "Todos os inscritos", description: "Todos que permitiram receber emails de marketing" },
  { value: "admins", label: "Administradores", description: "Apenas administradores do sistema" },
  { value: "veterans", label: "Veteranos", description: "Já participou de algum evento" },
  { value: "newbies", label: "Novatos", description: "Nunca participou de um evento" },
  { value: "new_registrations_30d", label: "Novos cadastros", description: "Cadastrados nos últimos 30 dias" },
  { value: "applied_never_attended", label: "Novatos (nunca participou)", description: "Se inscreveu mas nunca participou" },
]

export const SegmentSelector: FC<SegmentSelectorProps> = ({
  value,
  onChange,
  recipientCount,
  isLoadingCount,
  recipientPreview,
}) => {
  const currentSegment = useMemo(() => {
    if (value.adminsOnly) return "admins"
    if (value.veteransOnly) return "veterans"
    if (value.newbiesOnly) return "newbies"
    if (value.newRegistrations) return "new_registrations_30d"
    if (value.appliedNeverAttended) return "applied_never_attended"
    return "all"
  }, [value])
  
  const handleSegmentChange = (segmentType: SegmentType) => {
    const newFilter: SegmentFilter = {
      excludeRejected: value.excludeRejected ?? true,
    }
    
    switch (segmentType) {
      case "admins":
        newFilter.adminsOnly = true
        break
      case "veterans":
        newFilter.veteransOnly = true
        break
      case "newbies":
        newFilter.newbiesOnly = true
        break
      case "new_registrations_30d":
        newFilter.newRegistrations = true
        break
      case "applied_never_attended":
        newFilter.appliedNeverAttended = true
        break
      case "all":
      default:
        // No additional filters for "all"
        break
    }
    
    onChange(newFilter)
  }
  
  const handleExcludeRejectedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      excludeRejected: event.target.checked,
    })
  }
  
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="audience-segment">Audience Segment</Label>
        <Select value={currentSegment} onValueChange={handleSegmentChange}>
          <SelectTrigger id="audience-segment">
            <SelectValue placeholder="Select an audience segment" />
          </SelectTrigger>
          <SelectContent>
            {SEGMENT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="exclude-rejected"
          checked={value.excludeRejected ?? true}
          onChange={handleExcludeRejectedChange}
        />
        <Label htmlFor="exclude-rejected" className="text-sm">
          Exclude rejected participants
        </Label>
      </div>
      
      {(recipientCount !== undefined || isLoadingCount) && (
        <div className="text-sm text-muted-foreground">
          {isLoadingCount ? (
            <span>Calculating...</span>
          ) : (
            <span>{recipientCount} recipients</span>
          )}
        </div>
      )}
      
      {recipientPreview && recipientPreview.length > 0 && (
        <div className="border rounded-lg p-3 bg-muted/30">
          <h4 className="text-sm font-medium mb-2">Preview (showing {Math.min(5, recipientPreview.length)} recipients)</h4>
          <ul className="space-y-1">
            {recipientPreview.slice(0, 5).map((recipient) => (
              <li key={recipient.id} className="text-xs">
                <span className="font-medium">{recipient.full_name || "No name"}</span>
                <span className="text-muted-foreground ml-2">{recipient.email}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}