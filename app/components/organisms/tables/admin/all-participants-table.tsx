import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community"
import { Search } from "lucide-react"
import type { FC } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AGDataTable } from "~/components/organisms/tables/ag-grid/base/ag-data-table"
import { BaseMultiSelectFilter } from "~/components/organisms/tables/ag-grid/filters/base-multi-select-filter"
import { FlagBadgeRenderer } from "~/components/organisms/tables/ag-grid/renderers/flag-badge-renderer"
import { LastAttendedEventRenderer } from "~/components/organisms/tables/ag-grid/renderers/last-attended-event-renderer"
import { SocialNameRenderer } from "~/components/organisms/tables/ag-grid/renderers/social-name-renderer"
import { WarningIndicatorRenderer } from "~/components/organisms/tables/ag-grid/renderers/warning-indicator-renderer"
import { Input } from "~/components/ui/input"
import {
  getEventCountColors,
  getVeteranRookieColors,
} from "~/lib/helpers/cell-colors"
import {
  approvedToAttendStatusOptions,
  flagStatusOptions,
  genderFilterOptions,
  isVeteranOptions,
  orientationFilterOptions,
  profilePropMap,
} from "~/lib/helpers/propMaps"
import type { ProfileGlobal } from "~types/database/entities.types"

const STORAGE_KEYS = {
  gender: "all-participants-filter-gender",
  orientation: "all-participants-filter-orientation",
  isVeteran: "all-participants-filter-is_veteran",
  flag: "all-participants-filter-flag",
  approvedToAttend: "all-participants-filter-approved_to_attend",
}

const compactCell = {
  suppressSizeToFit: true,
  cellClass: "ag-cell-compact",
  width: 40,
}

function getStoredFilter(key: string, defaultValue: string[] = []): string[] {
  if (typeof window === "undefined") return defaultValue
  const stored = sessionStorage.getItem(key)
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed
    } catch {
      // Fall back to default
    }
  }
  return defaultValue
}

type AllParticipantsTableProps = {
  profiles: ProfileGlobal[]
}

export const AllParticipantsTable: FC<AllParticipantsTableProps> = ({
  profiles,
}) => {
  const gridApiRef = useRef<GridApi<ProfileGlobal> | null>(null)
  const [displayedRowCount, setDisplayedRowCount] = useState<number | null>(
    null,
  )
  const [genderFilter, setGenderFilter] = useState<string[]>(() =>
    getStoredFilter(STORAGE_KEYS.gender),
  )
  const [orientationFilter, setOrientationFilter] = useState<string[]>(() =>
    getStoredFilter(STORAGE_KEYS.orientation),
  )
  const [isVeteranFilter, setIsVeteranFilter] = useState<string[]>(() =>
    getStoredFilter(STORAGE_KEYS.isVeteran),
  )
  const [flagFilter, setFlagFilter] = useState<string[]>(() =>
    getStoredFilter(STORAGE_KEYS.flag),
  )
  const [approvedToAttendFilter, setApprovedToAttendFilter] = useState<
    string[]
  >(() => getStoredFilter(STORAGE_KEYS.approvedToAttend))
  const [searchText, setSearchText] = useState("")

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.gender, JSON.stringify(genderFilter))
    sessionStorage.setItem(
      STORAGE_KEYS.orientation,
      JSON.stringify(orientationFilter),
    )
    sessionStorage.setItem(
      STORAGE_KEYS.isVeteran,
      JSON.stringify(isVeteranFilter),
    )
    sessionStorage.setItem(STORAGE_KEYS.flag, JSON.stringify(flagFilter))
    sessionStorage.setItem(
      STORAGE_KEYS.approvedToAttend,
      JSON.stringify(approvedToAttendFilter),
    )
  }, [
    genderFilter,
    orientationFilter,
    isVeteranFilter,
    flagFilter,
    approvedToAttendFilter,
  ])

  const memoizedGenderOptions = useMemo(
    () => genderFilterOptions(profiles),
    [profiles],
  )
  const memoizedOrientationOptions = useMemo(
    () => orientationFilterOptions(profiles),
    [profiles],
  )

  const columnDefs: ColDef<ProfileGlobal>[] = useMemo(
    () => [
      {
        field: "social_name",
        headerName: "Nome",
        pinned: "left",
        cellRenderer: SocialNameRenderer,
        sortable: true,
      },
      {
        field: "gender",
        headerName: profilePropMap("gender"),
        cellRenderer: WarningIndicatorRenderer,
        cellRendererParams: { type: "gender" },
        valueFormatter: (params) =>
          Array.isArray(params.value) ? params.value.join(", ") : "",
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: memoizedGenderOptions,
          field: "gender",
          model: genderFilter,
          onModelChange: setGenderFilter,
          matchMode: "array",
        },
        sortable: true,
      },
      {
        field: "orientation",
        headerName: profilePropMap("orientation"),
        cellRenderer: WarningIndicatorRenderer,
        cellRendererParams: { type: "orientation" },
        valueFormatter: (params) =>
          Array.isArray(params.value) ? params.value.join(", ") : "",
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: memoizedOrientationOptions,
          field: "orientation",
          model: orientationFilter,
          onModelChange: setOrientationFilter,
          matchMode: "array",
        },
        sortable: true,
      },
      {
        field: "is_veteran",
        headerName: "Vet/Nov",
        headerTooltip: "Veterane ou Novate",
        cellRenderer: (params: { value: boolean | null }) =>
          params.value ? "Veterane" : "Novate",
        cellClass: (params) => getVeteranRookieColors(params.value),
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: isVeteranOptions,
          field: "is_veteran",
          model: isVeteranFilter,
          onModelChange: setIsVeteranFilter,
        },
        sortable: true,
      },
      {
        field: "flag",
        headerName: profilePropMap("flag"),
        headerTooltip: "Flag de atenção",
        cellRenderer: FlagBadgeRenderer,
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: flagStatusOptions,
          field: "flag",
          model: flagFilter,
          onModelChange: setFlagFilter,
        },
        sortable: true,
        ...compactCell,
      },
      {
        field: "where_lives",
        headerName: "Cidade",
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
        filter: BaseMultiSelectFilter,
        filterParams: {
          options: approvedToAttendStatusOptions,
          field: "approved_to_attend",
          model: approvedToAttendFilter,
          onModelChange: setApprovedToAttendFilter,
        },
        sortable: true,
      },
      {
        field: "attended_events_count",
        headerName: "Eventos",
        headerTooltip: "Quantidade de eventos",
        ...compactCell,
        cellClass: (params) =>
          `ag-cell-compact ${getEventCountColors(params.value)}`,
        sortable: true,
      },
      {
        field: "last_attended_event_title",
        headerName: "Último Evento",
        cellRenderer: LastAttendedEventRenderer,
        sortable: true,
      },
    ],
    [
      memoizedGenderOptions,
      memoizedOrientationOptions,
      genderFilter,
      orientationFilter,
      isVeteranFilter,
      flagFilter,
      approvedToAttendFilter,
    ],
  )

  const handleClearFilters = useCallback(() => {
    setGenderFilter([])
    setOrientationFilter([])
    setIsVeteranFilter([])
    setFlagFilter([])
    setApprovedToAttendFilter([])
    Object.values(STORAGE_KEYS).forEach((key) => sessionStorage.removeItem(key))
  }, [])

  const handleGridReady = useCallback((event: GridReadyEvent<ProfileGlobal>) => {
    gridApiRef.current = event.api
    setDisplayedRowCount(event.api.getDisplayedRowCount())
    event.api.addEventListener("filterChanged", () => {
      setDisplayedRowCount(event.api.getDisplayedRowCount())
    })
  }, [])

  const displayCount = displayedRowCount ?? profiles.length
  const isFiltered = displayCount !== profiles.length

  const tableHeader = (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="pl-9"
          aria-label="Buscar perfis"
        />
      </div>
      <div className="flex items-center gap-4 text-sm">
        <p>
          {isFiltered ? (
            <>
              <b>{displayCount}</b> de {profiles.length} perfis
            </>
          ) : (
            <>
              <b>{profiles.length}</b> perfis
            </>
          )}
        </p>
      </div>
    </div>
  )

  return (
    <AGDataTable
      id="all-participants-table"
      data={profiles}
      columnDefs={columnDefs}
      getRowId={(params) => params.data.id}
      pagination
      paginationAutoPageSize
      quickFilterText={searchText}
      emptyMessage="Nenhum perfil encontrado"
      persistState
      showToolbar
      onClearFilters={handleClearFilters}
      onGridReady={handleGridReady}
      headerContent={tableHeader}
    />
  )
}
