import { Badge } from "~/components/ui/badge"

interface VeteranRookieBadgeProps {
  isVeteran: boolean
}

export function VeteranRookieBadge({ isVeteran }: VeteranRookieBadgeProps) {
  return (
    <Badge variant={isVeteran ? "veteran" : "rookie"}>
      {isVeteran ? "Veterane" : "Novate"}
    </Badge>
  )
}
