import type { FC } from "react"

type DataPairProps = {
  pair: [string, string]
}
export const DataPair: FC<DataPairProps> = ({ pair }) => {
  return (
    <p>
      <span className="font-bold">{pair[0]}:</span> {pair[1]}
    </p>
  )
}
