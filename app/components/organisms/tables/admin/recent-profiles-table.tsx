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
import { adminTablesCopy } from "~/copy/admin/tables"
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
        headerName: adminTablesCopy.recentProfiles.columns.socialName,
        cellRenderer: SocialNameRenderer,
        sortable: true,
      },
      {
        field: "full_name",
        headerName: adminTablesCopy.recentProfiles.columns.fullName,
        sortable: true,
      },
      {
        field: "created_at",
        headerName: adminTablesCopy.recentProfiles.columns.createdAt,
        headerTooltip:
          adminTablesCopy.recentProfiles.columns.createdAtTooltip,
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
        headerName: adminTablesCopy.recentProfiles.columns.veteran,
        valueFormatter: (params) =>
          params.value
            ? adminTablesCopy.recentProfiles.columns.isVeteranYes
            : adminTablesCopy.recentProfiles.columns.isVeteranNo,
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
      emptyMessage={adminTablesCopy.recentProfiles.emptyMessage}
      height="400"
      showToolbar={false}
      persistState={false}
    />
  )
}
