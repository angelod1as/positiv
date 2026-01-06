import { useState, useCallback } from "react"
import type { IRowNode } from "ag-grid-community"
import { applicationStatusOptions } from "~/lib/helpers/propMaps"
import { BaseMultiSelectFilter } from "./base-multi-select-filter"

const options = applicationStatusOptions.map((opt) => ({
  value: opt.value,
  label: opt.name,
}))

export function ApplicationStatusFilter() {
  const [model, setModel] = useState<string[] | null>(null)

  const getValue = useCallback((node: IRowNode) => {
    return node.data?.application_status
  }, [])

  return (
    <BaseMultiSelectFilter
      model={model}
      onModelChange={setModel}
      getValue={getValue}
      options={options}
    />
  )
}
