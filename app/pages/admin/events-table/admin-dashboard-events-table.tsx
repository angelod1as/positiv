import type { FC } from "react"
import { DataTable } from "~/components/organisms/data-table/data-table"
import type { Event } from "~types/entities.types"
import { adminDashboardEventsTableColumns } from "./admin-dashboard-events-table-columns"

type AdminDashboardEventsTableProps = {
  events: Event[]
}
export const AdminDashboardEventsTable: FC<AdminDashboardEventsTableProps> = ({
  events,
}) => {
  return (
    <DataTable
      data={events}
      columns={adminDashboardEventsTableColumns}
      filterBy="Título"
    />
  )
}
