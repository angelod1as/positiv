import type { FC } from "react"

type DataPairProps = {
  pair: [string, string | boolean | number | null | undefined | string[]]
  suffix?: string
}

export const DataPair: FC<DataPairProps> = ({ pair, suffix = "" }) => {
  // Passes boolean values
  if (pair[1] === null || pair[1] === undefined) return null
  const label = pair[0]
  const value = Array.isArray(pair[1]) ? pair[1].join(", ") : pair[1]

  return (
    <p>
      <span className="font-bold">{label}:</span>{" "}
      {typeof value === "boolean" ? (value ? "Sim" : "Não") : value}
      {suffix}
    </p>
  )
}
