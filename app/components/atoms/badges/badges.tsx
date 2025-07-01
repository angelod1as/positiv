import { Badge } from "~/components/ui/badge"
import { cn } from "~/lib/utils"

export const VeteranBadge = () => <Badge variant="veteran">Veterane</Badge>

export const RookieBadge = () => <Badge variant="rookie">Novate</Badge>

export const OrientationWarning = ({
  orientations,
}: {
  orientations: string[] | null
}) =>
  orientations?.length ? (
    <div className="flex gap-1 flex-wrap">
      {orientations.map((orientation) => (
        <p
          key={orientation}
          className={cn(orientation === "Hétero" && "text-red-700")}
        >
          {orientation}
        </p>
      ))}
    </div>
  ) : null

export const GenderWarning = ({ genders }: { genders: string[] | null }) =>
  genders?.length ? (
    <div className="flex gap-1 flex-wrap">
      {genders.map((gender) => (
        <p
          key={gender}
          className={cn(
            (gender.includes("trans") || gender.includes("agêner")) &&
              "text-blue-700",
          )}
        >
          {gender}
        </p>
      ))}
    </div>
  ) : null
