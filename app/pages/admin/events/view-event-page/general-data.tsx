import { type FC } from "react"
import { eventPropNameMap } from "~/lib/helpers/propMaps"

type GeneralDataProps = {
  description: string | null
  location: string | null
  ticket_price: number | null
  total_spots: number | null
}
export const GeneralData: FC<GeneralDataProps> = ({
  description,
  location,
  ticket_price,
  total_spots,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <h2>Dados gerais</h2>
      {description && (
        <p>
          {eventPropNameMap("description")}: {description}
        </p>
      )}
      {location && (
        <p>
          {eventPropNameMap("location")}: {location}
        </p>
      )}
      {ticket_price && (
        <p>
          {eventPropNameMap("ticket_price")}: R$ {ticket_price}
        </p>
      )}
      {total_spots && (
        <p>
          {eventPropNameMap("total_spots")}: {total_spots}
        </p>
      )}
    </div>
  )
}
