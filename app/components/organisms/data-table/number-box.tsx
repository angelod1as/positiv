import type { ColumnDef } from "@tanstack/react-table"

export const numberBox = <T,>() => {
  const box: ColumnDef<T> = {
    id: "Número",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground" data-table-role="index">
        {row.index + 1}
      </span>
    ),
    enableSorting: false,
    enableHiding: false,
  }
  return box
}
