import { type FC } from "react"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import type { Event } from "~types/database/entities.types"

type DatesAndTimesProps = Event
export const DatesAndTimes: FC<DatesAndTimesProps> = ({
  time_application_end,
  time_application_start,
  time_event_end,
  time_event_start,
  time_group_end,
  time_group_start,
  time_interviews_end,
  time_interviews_start,
  time_payment_end,
  time_payment_start,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <h2>Datas e horários</h2>
      <table className="min-w-full border-collapse text-left">
        <thead>
          <tr>
            <th />
            <th className="font-bold">Início</th>
            <th className="font-bold">Fim</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="font-bold">Inscrições</td>
            <td>{formatDateTime(time_application_start).date}</td>
            <td>{formatDateTime(time_application_end).date}</td>
          </tr>
          <tr>
            <td className="font-bold">Entrevistas</td>
            <td>{formatDateTime(time_interviews_start).date}</td>
            <td>{formatDateTime(time_interviews_end).date}</td>
          </tr>
          <tr>
            <td className="font-bold">Pagamento</td>
            <td>{formatDateTime(time_payment_start).date}</td>
            <td>{formatDateTime(time_payment_end).date}</td>
          </tr>
          <tr>
            <td className="font-bold">Grupo</td>
            <td>{formatDateTime(time_group_start).date}</td>
            <td>{formatDateTime(time_group_end).date}</td>
          </tr>
          <tr>
            <td className="font-bold">Evento</td>
            <td>{formatDateTime(time_event_start).date}</td>
            <td>{formatDateTime(time_event_end).date}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
