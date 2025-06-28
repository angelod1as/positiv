import { Badge } from "~/components/ui/badge"

export const VeteranBadge = () => <Badge variant="veteran">Veterane</Badge>

export const RookieBadge = () => <Badge variant="rookie">Novate</Badge>

export const PronoumsBadge = ({ pronouns }: { pronouns: string[] | null }) =>
  pronouns?.length ? (
    <Badge variant="pronouns">{pronouns.join(", ")}</Badge>
  ) : null
export const OrientationBadge = ({
  orientation,
}: {
  orientation: string[] | null
}) =>
  orientation?.length ? (
    <Badge variant="orientation">{orientation.join(", ")}</Badge>
  ) : null
export const GenderBadge = ({ gender }: { gender: string[] | null }) =>
  gender?.length ? <Badge variant="gender">{gender.join(", ")}</Badge> : null
