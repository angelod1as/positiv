import { MaximizeIcon, MinimizeIcon, type LucideIcon } from "lucide-react"
import { FilterService } from "primereact/api"
import { Column } from "primereact/column"
import {
  DataTable as PrimeReactDataTable,
  type DataTableFilterMeta,
  type DataTableValue,
} from "primereact/datatable"

import { InputText } from "primereact/inputtext"
import { useState, type ChangeEvent, type ReactNode } from "react"
import { Button } from "~/components/atoms/button/button"
import { cn } from "~/lib/utils"

type buttonProps = {
  /** Aria title */
  title: string
  /** Link URL or function */
  to: string | ((id: string) => string)
  /** Link function property */
  key?: string
  /** Lucide icon */
  Icon: LucideIcon
}

export interface DataTableProps<T extends DataTableValue> {
  value: T[]
  id: string
  filters?: DataTableFilterMeta
  onFilter?: (filters: DataTableFilterMeta) => void
  globalFilterFields?: string[]
  headerTitle?: string
  children: ReactNode
  rows?: number
  scrollHeight?: string
  stateKey?: string
  emptyMessage?: string
  buttons?: Array<buttonProps>
  selectable?: boolean
  resizableColumns?: boolean
  reorderableColumns?: boolean
  sortField?: string
}

// TODO: Implement date filtering
FilterService.register("custom_time_event_start", (_value, _filters) => {
  // const [from, to] = filters ?? [null, null];
  // if (from === null && to === null) return true;
  // if (from !== null && to === null) return from <= value;
  // if (from === null && to !== null) return value <= to;
  // return from <= value && value <= to;
  return true
})

export function DataTable<T extends DataTableValue>({
  value,
  id,
  filters: initialFilters,
  onFilter,
  globalFilterFields = [],
  headerTitle,
  children,
  rows = 150,
  buttons = [],
  selectable = false,
  resizableColumns = false,
  reorderableColumns = false,
  sortField,
}: DataTableProps<T>) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [filters, setFilters] = useState<DataTableFilterMeta>(
    initialFilters || {},
  )
  const [globalFilterValue, setGlobalFilterValue] = useState("")
  const [selection, setSelection] = useState<T[]>([])
  const [values, setValues] = useState(value)

  const toggleMaximized = () => setIsMaximized((state) => !state)

  const onGlobalFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const stateFilters = { ...filters }
    if ("global" in stateFilters && "value" in stateFilters["global"]) {
      stateFilters["global"].value = value
      setFilters(stateFilters)
      setGlobalFilterValue(value)
      onFilter?.(stateFilters)
    }
  }

  const renderHeader = () => (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        {headerTitle && (
          <span className="font-semibold text-lg">{headerTitle}</span>
        )}
        {globalFilterFields.length > 0 && (
          <InputText
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder="Buscar..."
          />
        )}
      </div>
      <Button
        variant="outline"
        onClick={toggleMaximized}
        title={isMaximized ? "Minimizar tabela" : "Maximizar tabela"}
      >
        {isMaximized ? <MinimizeIcon /> : <MaximizeIcon />}
      </Button>
    </div>
  )

  //// See top todo
  // const dateRowFilterTemplate = (
  //   options: ColumnFilterElementTemplateOptions,
  // ) => {
  //   return (
  //     <Input
  //       type="date"
  //       value={options.value || ""}
  //       onChange={(e) => options.filterApplyCallback(e.target.value)}
  //     />
  //   )
  // }

  return (
    <PrimeReactDataTable
      value={values}
      className={cn(isMaximized && "maximized-table", "bg-white")}
      // Base Settings
      dataKey="id"
      emptyMessage="Nenhum registro encontrado"
      header={renderHeader}
      stripedRows
      rowHover
      // Pagination
      rows={rows}
      paginator
      // Filters
      filters={filters}
      filterDisplay="menu"
      onFilter={(e) => {
        setFilters(e.filters)
        onFilter?.(e.filters)
      }}
      globalFilterFields={globalFilterFields}
      // State
      stateStorage="session"
      stateKey={`dt-${id}-table`}
      // Scroll
      scrollable
      scrollHeight="flex"
      // Sorting
      sortField={sortField}
      sortMode="single"
      removableSort
      sortOrder={1}
      // Selection
      selection={selection}
      onSelectionChange={(e) => setSelection(e.value)}
      selectionMode="checkbox"
      // Resize
      resizableColumns={resizableColumns}
      columnResizeMode="fit"
      // Reorder
      reorderableColumns={reorderableColumns}
      onRowReorder={(e) => setValues(e.value)}
    >
      {selectable && (
        <Column
          selectionMode="multiple"
          headerStyle={{ width: "3rem" }}
          alignFrozen="left"
        />
      )}
      <Column field="id" header="id" hidden={true} />
      {children}

      {/* Buttons */}
      {buttons.length > 0 && (
        <Column
          body={(value: T) => {
            return (
              <div className="flex gap-2 justify-self-end">
                {buttons.map(({ Icon, title, to, key = "id" }) => {
                  return (
                    <Button
                      to={typeof to === "function" ? key && to(value[key]) : to}
                      key={title}
                      aria-label={title}
                      variant="outline"
                    >
                      <Icon />
                    </Button>
                  )
                })}
              </div>
            )
          }}
        />
      )}
    </PrimeReactDataTable>
  )
}
