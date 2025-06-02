import type { ColumnDef } from "@tanstack/react-table"

export const numberBox = <T,>() => {
  const box: ColumnDef<T> = {
    id: "Número",
    cell: ({ row }) => <>{row.index + 1}</>,
    enableSorting: false,
    enableHiding: false,
  }
  return box
}
