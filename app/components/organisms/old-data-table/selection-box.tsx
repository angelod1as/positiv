import type { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "~/components/ui/checkbox"

export const selectionBox = <T,>() => {
  const box: ColumnDef<T> = {
    id: "Seleção",
    meta: {
      className: "bg-white sticky left-0",
    },
    header: ({ table }) => {
      return (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            table.getIsSomePageRowsSelected()
          }
          onChange={(event) =>
            table.toggleAllPageRowsSelected(!!event.target.checked)
          }
          aria-label="Select all"
        />
      )
    },
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onChange={(event) => {
          return row.toggleSelected(!!event.target.checked)
        }}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  }
  return box
}
