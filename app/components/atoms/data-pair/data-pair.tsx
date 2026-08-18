import type { FC } from "react"
import { sharedCopy } from "~/copy/shared"
import { cn } from "~/lib/utils"

type DataPairProps = {
  pair: [string, string | boolean | number | null | undefined | string[]]
  suffix?: string
  top?: boolean
  className?: string
}

export const DataPair: FC<DataPairProps> = ({
  pair,
  suffix = "",
  top = false,
  className,
}) => {
  // Passes boolean values
  if (pair[1] === null || pair[1] === undefined) return null
  const label = pair[0]
  const value = Array.isArray(pair[1]) ? pair[1].join(", ") : pair[1]

  return (
    <p className={cn(top && "flex flex-col", className)}>
      <span className="font-bold">
        {label}
        {label.includes("?") ? "" : ":"}
      </span>{" "}
      {typeof value === "boolean" ? (value ? sharedCopy.values.yes : sharedCopy.values.no) : value}
      {suffix}
    </p>
  )
}
