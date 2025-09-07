import { EyeIcon, PencilIcon } from "lucide-react"
import { FilterMatchMode, FilterService } from "primereact/api"
import {
  Column,
  type ColumnFilterElementTemplateOptions,
} from "primereact/column"
import { MultiSelect } from "primereact/multiselect"
import { useEffect, useState, type FC } from "react"
import { Button } from "~/components/atoms/button/button"
import { DataTable } from "~/components/organisms/tables/base/data-table"
import { formatDateTime } from "~/lib/helpers/format-date-time"
import { eventPropNameMap, eventStatusMap } from "~/lib/helpers/propMaps"
import paths from "~/lib/paths"
import type { Event, EventStatus } from "~types/database/entities.types"

const {
  admin: {
    events: { ADMIN_VIEW_EVENT, ADMIN_EDIT_EVENT, ADMIN_CREATE_EVENT },
  },
} = paths

const SESSION_STORAGE_KEY = 'admin-events-filter-status'

// Type for our custom filter structure
interface CustomFilterMeta {
  [key: string]: {
    value: unknown
    matchMode: string
  }
}

const ALL_STATUS_OPTIONS: EventStatus[] = [
  "Draft",
  "Scheduled",
  "Registration Open",
  "Registration Closed",
  "Cancelled",
  "Completed",
]

const DEFAULT_SELECTED_STATUSES: EventStatus[] = [
  "Draft",
  "Scheduled",
  "Registration Open",
  "Registration Closed",
]

// Register custom filter for event_status field
// Custom filters must be registered with the pattern "custom_[field]"
FilterService.register('custom_event_status', (value: EventStatus, filters: EventStatus[] | null) => {
  if (!filters || filters.length === 0) return true
  return filters.includes(value)
})

const statusMultiSelectFilterTemplate = (options: ColumnFilterElementTemplateOptions) => {
  const selectedCount = options.value ? options.value.length : 0
  const totalCount = ALL_STATUS_OPTIONS.length
  
  return (
    <MultiSelect
      value={options.value}
      options={ALL_STATUS_OPTIONS.map((status) => ({
        label: eventStatusMap(status),
        value: status,
      }))}
      onChange={(e) => {
        options.filterCallback(e.value, options.index)
        // Save to sessionStorage
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(e.value))
        }
      }}
      placeholder={selectedCount > 0 ? `${selectedCount} de ${totalCount} selecionados` : "Selecionar status"}
      display="chip"
      showClear
      filter
      filterPlaceholder="Buscar status"
      className="p-column-filter"
      maxSelectedLabels={3}
      selectedItemsLabel="{0} status selecionados"
    />
  )
}

type AdminDashboardEventsTableProps = {
  events: Event[]
}
export const AdminDashboardEventsTable: FC<AdminDashboardEventsTableProps> = ({
  events,
}) => {
  // Initialize filter state from sessionStorage or use defaults
  const [statusFilter, setStatusFilter] = useState<EventStatus[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch (e) {
          console.error('Failed to parse stored filter:', e)
        }
      }
    }
    return DEFAULT_SELECTED_STATUSES
  })

  const [filters, setFilters] = useState<CustomFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    time_event_start: { value: null, matchMode: 'custom_time_event_start' },
    event_status: { 
      value: statusFilter, 
      matchMode: 'custom_event_status'
    },
  })

  // Update filters when statusFilter changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      event_status: {
        value: statusFilter,
        matchMode: 'custom_event_status'
      }
    }))
  }, [statusFilter])

  return (
    <DataTable
      id="admin-events"
      data={events}
      filters={filters}
      onFilter={(e) => {
        const newFilters = e.filters as CustomFilterMeta
        setFilters(newFilters)
        // Update statusFilter state if event_status filter changed
        if ('event_status' in newFilters && newFilters.event_status) {
          const eventStatusFilter = newFilters.event_status
          const filterValue = eventStatusFilter.value as EventStatus[] | null
          if (filterValue && filterValue !== statusFilter) {
            setStatusFilter(filterValue)
          }
        }
      }}
      header={{
        title: "Todos os eventos",
        elements: (
          <>
            <Button to={ADMIN_CREATE_EVENT}>Criar evento</Button>
          </>
        ),
      }}
      buttons={[
        {
          Icon: EyeIcon,
          to: ADMIN_VIEW_EVENT,
          title: "Ver evento",
        },
        {
          Icon: PencilIcon,
          to: ADMIN_EDIT_EVENT,
          title: "Editar evento",
        },
      ]}
    >
      <Column
        field="title"
        header={eventPropNameMap("title")}
        alignFrozen="left"
        sortable
        frozen={true}
      />
      <Column
        field="event_status"
        header={eventPropNameMap("event_status")}
        body={(value) => eventStatusMap(value.event_status)}
        filter
        filterElement={statusMultiSelectFilterTemplate}
        filterField="event_status"
        showFilterMatchModes={false}
      />
      <Column
        field="time_event_start"
        header={eventPropNameMap("time_event_start")}
        body={(value) => formatDateTime(value.time_event_start).full}
        sortable
        // filter
        // filterElement={dateRowFilterTemplate}
        showFilterMatchModes={false}
        filterType="date"
        dataType="date"
      />
    </DataTable>
  )
}
