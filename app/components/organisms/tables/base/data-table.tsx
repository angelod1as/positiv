import {
  FilterXIcon,
  MaximizeIcon,
  MinimizeIcon,
  type LucideIcon,
} from "lucide-react"
import { FilterService } from "primereact/api"
import { Column } from "primereact/column"
import {
  DataTable as PrimeReactDataTable,
  type DataTableFilterMeta,
  type DataTableRowClickEvent,
  type DataTableValue,
} from "primereact/datatable"

import { InputText } from "primereact/inputtext"
import { useEffect, useState, type ChangeEvent, type ReactNode } from "react"
import type { LinkProps } from "react-router"
import { Button } from "~/components/atoms/button/button"
import { TooltipProvider } from "~/components/ui/tooltip"
import DelayedContent from "~/lib/helpers/delayed-component"
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
  /** Prefetch strategy for the link */
  prefetch?: LinkProps["prefetch"]
}

export type DataTableHeader = {
  title?: string
  elements?: ReactNode
}

type FlexibleFilterMeta =
  | DataTableFilterMeta
  | Record<string, { value: unknown; matchMode: string }>

export interface DataTableProps<T extends DataTableValue> {
  data: T[]
  id: string
  filters?: FlexibleFilterMeta
  onFilter?: (event: { filters: FlexibleFilterMeta }) => void
  onClearFilters?: () => void
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
  sortOrder?: 1 | -1 | 0 | null | undefined
  editMode?: "cell" | "row"
  size?: "small" | "normal" | "large"
  maxHeight?: string | "auto"
  loadingComponent?: ReactNode
  onRowClick?: (event: DataTableRowClickEvent) => void
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

export function DataTable<T extends DataTableValue>({
  data,
  id,
  filters: initialFilters,
  onFilter,
  onClearFilters,
  globalFilterFields = [],
  header,
  children,
  buttons = [],
  selectable = false,
  resizableColumns = false,
  reorderableColumns = false,
  sortField,
  sortOrder = 1,
  editMode,
  size = "small",
  maxHeight = "500px",
  emptyMessage = "Nenhum registro encontrado",
  loadingComponent,
  onRowClick,
}: DataTableProps<T>) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [filters, setFilters] = useState<FlexibleFilterMeta>(
    initialFilters || {},
  )
  const [globalFilterValue, setGlobalFilterValue] = useState("")
  const [selection, setSelection] = useState<T[]>([])
  const [values, setValues] = useState(data)

  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters)
      if ("global" in initialFilters && "value" in initialFilters.global) {
        const globalValue = initialFilters.global.value
        if (typeof globalValue === "string") {
          setGlobalFilterValue(globalValue)
        } else {
          setGlobalFilterValue("")
        }
      }
    }
  }, [initialFilters])

  const toggleMaximized = () => setIsMaximized((state) => !state)

  const handleClearFilters = () => {
    setFilters({})
    setGlobalFilterValue("")
    onClearFilters?.()
  }

  const onGlobalFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const stateFilters = { ...filters }
    if ("global" in stateFilters && "value" in stateFilters["global"]) {
      stateFilters["global"].value = value
      setFilters(stateFilters)
      setGlobalFilterValue(value)
      onFilter?.({ filters: stateFilters })
    }
  }

  const renderHeader = () => {
    const { elements, title } = header || {}

    return (
      <div className="flex justify-between items-end font-normal">
        <div className="flex items-center gap-4">
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
          <div className="flex items-end gap-4">{elements}</div>
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
    <TooltipProvider delayDuration={0}>
      <DelayedContent loadingComponent={loadingComponent}>
        <PrimeReactDataTable
        value={values}
        className={cn(
          isMaximized && "maximized-table",
          onRowClick && "cursor-pointer",
        )}
        style={{
          maxHeight: isMaximized ? undefined : maxHeight,
        }}
        cellClassName={() => "text-sm"}
        // Base Settings
        dataKey="id"
        emptyMessage={emptyMessage}
        header={renderHeader}
        showGridlines
        stripedRows
        rowHover
        editMode={editMode}
        size={size}
        onRowClick={onRowClick}
        // Pagination
        rows={25}
        paginator
        rowsPerPageOptions={[5, 10, 25, 50, 100, 150]}
        paginatorLeft={
          <Button
            variant="outline"
            onClick={handleClearFilters}
            title="Limpar todos os filtros"
          >
            <FilterXIcon className="mr-2 h-4 w-4" />
            Limpar filtros
          </Button>
        }
        // Filters
        filters={filters as DataTableFilterMeta}
        filterDisplay="menu"
        onFilter={(e) => {
          setFilters(e.filters)
          onFilter?.({ filters: e.filters })
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
        sortOrder={sortOrder}
        // Selection
        selection={onRowClick ? undefined : selection}
        onSelectionChange={onRowClick ? undefined : (e) => setSelection(e.value)}
        selectionMode={onRowClick ? undefined : "checkbox"}
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
            frozen
            alignFrozen="right"
            body={(value: T) => {
              return (
                <div className="flex gap-2 justify-self-end">
                  {buttons.map(
                    ({ Icon, title, to, key = "id", target, prefetch }) => {
                      return (
                        <Button
                          to={
                            typeof to === "function"
                              ? key && to(value[key])
                              : to
                          }
                          key={title}
                          aria-label={title}
                          variant="outline"
                          linkProps={{
                            ...(target && { target }),
                            ...(prefetch && { prefetch }),
                          }}
                        >
                          <Icon />
                        </Button>
                      )
                    },
                  )}
                </div>
              )
            }}
          />
        )}
      </PrimeReactDataTable>
    </DelayedContent>
    </TooltipProvider>
  )
}
