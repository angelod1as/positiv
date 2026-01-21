/**
 * Recent Profiles Table - Admin Dashboard
 *
 * Read-only AG Grid table showing the last 10 registered profiles.
 */
import type { ColDef } from "ag-grid-community"
import type { FC } from "react"
import { useMemo } from "react"
import { AGDataTable } from "~/components/organisms/tables/ag-grid/base/ag-data-table"
import { SocialNameRenderer } from "~/components/organisms/tables/ag-grid/renderers/social-name-renderer"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import {
  approvedToAttendStatusOptions,
  profilePropMap,
} from "~/lib/helpers/propMaps"
import type { ProfileGlobal } from "~types/database/entities.types"

interface RecentProfilesTableProps {
  profiles: ProfileGlobal[]
}

export const RecentProfilesTable: FC<RecentProfilesTableProps> = ({
  profiles,
}) => {
  const columnDefs: ColDef<ProfileGlobal>[] = useMemo(
    () => [
      {
        field: "social_name",
        headerName: "Nome Social",
        cellRenderer: SocialNameRenderer,
        sortable: true,
      },
      {
        field: "full_name",
        headerName: "Nome Completo",
        sortable: true,
      },
      {
        field: "created_at",
        headerName: "Registro",
        headerTooltip: "Data de cadastro",
        valueFormatter: (params) =>
          formatDateTime(params.value, "numeric").date ?? "-",
        sortable: true,
        sort: "desc",
      },
      {
        field: "gender",
        headerName: profilePropMap("gender"),
        valueFormatter: (params) =>
          Array.isArray(params.value) ? params.value.join(", ") : "",
        sortable: true,
      },
      {
        field: "orientation",
        headerName: profilePropMap("orientation"),
        valueFormatter: (params) =>
          Array.isArray(params.value) ? params.value.join(", ") : "",
        sortable: true,
      },
      {
        field: "is_veteran",
        headerName: "Veterane",
        valueFormatter: (params) => (params.value ? "Sim" : "Nao"),
        sortable: true,
      },
      {
        field: "approved_to_attend",
        headerName: profilePropMap("approved_to_attend"),
        valueFormatter: (params) => {
          const option = approvedToAttendStatusOptions.find(
            (o) => o.value === params.value,
          )
          return option?.name || params.value
        },
        sortable: true,
      },
    ],
    [],
  )

  return (
    <AGDataTable
      id="recent-profiles"
      data={profiles}
      columnDefs={columnDefs}
      getRowId={(params) => params.data.id}
      emptyMessage="Nenhum perfil recente"
      height="400"
      showToolbar={false}
      persistState={false}
    />
  )
}
