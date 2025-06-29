import { Badge } from "~/components/ui/badge"

export const VeteranBadge = () => <Badge variant="veteran">Veterane</Badge>

export const RookieBadge = () => <Badge variant="rookie">Novate</Badge>

export const PronounsBadge = ({ pronouns }: { pronouns: string[] | null }) =>
  pronouns?.length ? (
    <div className="flex gap-1 flex-wrap">
      {pronouns.map((pronoun) => (
        <Badge key={pronoun} variant="pronoun">
          {pronoun}
        </Badge>
      ))}
    </div>
  ) : null

export const OrientationBadge = ({
  orientations,
}: {
  orientations: string[] | null
}) =>
  orientations?.length ? (
    <div className="flex gap-1 flex-wrap">
      {orientations.map((orientation) => (
        <Badge key={orientation} variant="orientation">
          {orientation}
        </Badge>
      ))}
    </div>
  ) : null

export const GenderBadge = ({ genders }: { genders: string[] | null }) =>
  genders?.length ? (
    <div className="flex gap-1 flex-wrap">
      {genders.map((gender) => (
        <Badge key={gender} variant="gender">
          {gender}
        </Badge>
      ))}
    </div>
  ) : null
