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
  | "veterans"
  | "newbies"
  | "never_attended"
  | "has_attended"
  | "never_applied"
  | "applied_never_attended"

const SEGMENT_OPTIONS: { value: SegmentType; label: string; description: string }[] = [
  { value: "all", label: "All subscribers", description: "Send to everyone who opted in" },
  { value: "veterans", label: "Veterans only", description: "People who have attended before" },
  { value: "newbies", label: "Newbies only", description: "People who haven't attended yet" },
  { value: "never_attended", label: "Never attended any event", description: "Never participated in any event" },
  { value: "has_attended", label: "Has attended at least one event", description: "Participated in one or more events" },
  { value: "never_applied", label: "New registrations", description: "Registered but never applied to events" },
  { value: "applied_never_attended", label: "Applied but never attended", description: "Applied to events but never attended" },
]

export const SegmentSelector: FC<SegmentSelectorProps> = ({
  value,
  onChange,
  recipientCount,
  isLoadingCount,
  recipientPreview,
}) => {
  const currentSegment = useMemo(() => {
    if (value.veteransOnly) return "veterans"
    if (value.newbiesOnly) return "newbies"
    if (value.activityType === "never_attended") return "never_attended"
    if (value.activityType === "has_attended") return "has_attended"
    if (value.activityType === "never_applied") return "never_applied"
    if (value.activityType === "applied_never_attended") return "applied_never_attended"
    return "all"
  }, [value])
  
  const handleSegmentChange = (segmentType: SegmentType) => {
    const newFilter: SegmentFilter = {
      excludeRejected: value.excludeRejected ?? true,
    }
    
    switch (segmentType) {
      case "veterans":
        newFilter.veteransOnly = true
        break
      case "newbies":
        newFilter.newbiesOnly = true
        break
      case "never_attended":
        newFilter.activityType = "never_attended"
        break
      case "has_attended":
        newFilter.activityType = "has_attended"
        break
      case "never_applied":
        newFilter.activityType = "never_applied"
        break
      case "applied_never_attended":
        newFilter.activityType = "applied_never_attended"
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