import { Badge } from "~/components/ui/badge"
import { getEventCountColors } from "~/lib/helpers/cell-colors"
import { cn } from "~/lib/utils"

export const VeteranBadge = ({ eventCount }: { eventCount?: number | null } = {}) => (
  <div className="flex items-center gap-1.5">
    <Badge variant="veteran">Veterane</Badge>
    {eventCount !== undefined && eventCount !== null && (
      <span className={cn(
        "inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-medium shadow",
        getEventCountColors(eventCount)
      )}>
        {eventCount}
      </span>
    )}
  </div>
)

export const RookieBadge = () => <Badge variant="rookie">Novate</Badge>

export const OrientationWarning = ({
  orientations,
}: {
  orientations: string[] | null
}) =>
  orientations?.length ? (
    <div className="flex gap-1 flex-wrap">
      {orientations.map((orientation, idx) => {
        const lowerOrientation = orientation.toLocaleLowerCase('pt-BR')
        const shouldHighlight = 
          lowerOrientation === "hétero" || 
          lowerOrientation === "sapiosexual"
        
        return (
          <p
            key={`${orientation}-${idx}`}
            className={cn(shouldHighlight && "text-red-700")}
          >
            {orientation}
          </p>
        )
      })}
    </div>
  ) : null

export const GenderWarning = ({ genders }: { genders: string[] | null }) =>
  genders?.length ? (
    <div className="flex gap-1 flex-wrap">
      {genders.map((gender, idx) => {
        const lowerGender = gender.toLocaleLowerCase('pt-BR')
        const shouldHighlight = 
          lowerGender.includes("trans") || 
          lowerGender.includes("agêner") || 
          lowerGender === "travesti" || 
          /não[\s-]?bin[aá]ri/i.test(lowerGender)
        
        return (
          <p
            key={`${gender}-${idx}`}
            className={cn(shouldHighlight && "text-blue-700")}
          >
            {gender}
          </p>
        )
      })}
    </div>
  ) : null
