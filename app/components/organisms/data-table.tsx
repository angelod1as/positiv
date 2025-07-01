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
import type { LinkProps } from "react-router"
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
  /** Link target */
  target?: LinkProps["target"]
}

export type DataTableHeader = {
  title?: string
  numbers: ReactNode
}

export interface DataTableProps<T extends DataTableValue> {
  data: T[]
  id: string
  filters?: DataTableFilterMeta
  onFilter?: (filters: DataTableFilterMeta) => void
  globalFilterFields?: string[]
  header?: DataTableHeader
  children: ReactNode
  scrollHeight?: string
  stateKey?: string
  emptyMessage?: string
  buttons?: Array<buttonProps>
  selectable?: boolean
  resizableColumns?: boolean
  reorderableColumns?: boolean
  sortField?: string
  editMode?: "cell" | "row"
  size?: "small" | "normal" | "large"
}

// TODO: POS-144 Implement date filtering
FilterService.register("custom_time_event_start", (_value, _filters) => {
  // const [from, to] = filters ?? [null, null];
  // if (from === null && to === null) return true;
  // if (from !== null && to === null) return from <= value;
  // if (from === null && to !== null) return value <= to;
  // return from <= value && value <= to;
  return true
})

// TODO: POS-145 Change value to data (better naming)
export function DataTable<T extends DataTableValue>({
  data,
  id,
  filters: initialFilters,
  onFilter,
  globalFilterFields = [],
  header,
  children,
  buttons = [],
  selectable = false,
  resizableColumns = false,
  reorderableColumns = false,
  sortField,
  editMode,
  size = "small",
}: DataTableProps<T>) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [filters, setFilters] = useState<DataTableFilterMeta>(
    initialFilters || {},
  )
  const [globalFilterValue, setGlobalFilterValue] = useState("")
  const [selection, setSelection] = useState<T[]>([])
  const [values, setValues] = useState(data)

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

  const renderHeader = () => {
    const { numbers, title } = header || {}

    return (
      <div className="flex justify-between items-end font-normal">
        <div className="flex gap-4">
          <div>
            {title && <span className="font-semibold text-lg">{title}</span>}
          </div>
          <div>
            {globalFilterFields.length > 0 && (
              <InputText
                value={globalFilterValue}
                onChange={onGlobalFilterChange}
                placeholder="Buscar..."
              />
            )}
          </div>
          <div className="flex items-end gap-4">{numbers}</div>
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
  }

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
      className={cn(isMaximized && "maximized-table")}
      cellClassName={() => "text-sm"}
      // Base Settings
      dataKey="id"
      emptyMessage="Nenhum registro encontrado"
      header={renderHeader}
      showGridlines
      stripedRows
      rowHover
      editMode={editMode}
      size={size}
      // Pagination
      rows={25}
      paginator
      rowsPerPageOptions={[5, 10, 25, 50, 100, 150]}
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
                {buttons.map(({ Icon, title, to, key = "id", target }) => {
                  return (
                    <Button
                      to={typeof to === "function" ? key && to(value[key]) : to}
                      key={title}
                      aria-label={title}
                      variant="outline"
                      linkProps={
                        target
                          ? {
                              target,
                            }
                          : undefined
                      }
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
