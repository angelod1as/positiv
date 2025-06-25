import type { FC } from "react"
import { DataTable } from "~/components/organisms/data-table/data-table"
import type { Newsletter } from "~types/entities.types"
import { adminDashboardNewslettersTableColumns } from "./admin-dashboard-newsletters-table-columns"

type AdminDashboardNewslettersTableProps = {
  newsletters: Newsletter[]
}
export const AdminDashboardNewslettersTable: FC<AdminDashboardNewslettersTableProps> = ({ newsletters }) => {
  return (
    <DataTable
      data={newsletters}
      columns={adminDashboardNewslettersTableColumns}
      filterBy="Assunto"
    />
  )
}