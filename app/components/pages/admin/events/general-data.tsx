import { type FC } from "react"
import { adminEventsCopy } from "~/copy/admin/events"
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
      <h2>{adminEventsCopy.generalData.title}</h2>
      {description && (
        <p>
          {adminEventsCopy.generalData.field(
            eventPropNameMap("description"),
            description,
          )}
        </p>
      )}
      {location && (
        <p>
          {adminEventsCopy.generalData.field(
            eventPropNameMap("location"),
            location,
          )}
        </p>
      )}
      {ticket_price && (
        <p>
          {adminEventsCopy.generalData.ticketPrice(
            eventPropNameMap("ticket_price"),
            ticket_price,
          )}
        </p>
      )}
      {total_spots && (
        <p>
          {adminEventsCopy.generalData.field(
            eventPropNameMap("total_spots"),
            total_spots,
          )}
        </p>
      )}
    </div>
  )
}
