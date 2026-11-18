import type { DatavizRange } from '~/business/reporting/dataviz/dataviz-range'
import { adminDatavizCopy } from '~/copy/admin/dataviz'
import type { Party } from './party-range'
import { PartyRangeSelector } from './party-range-selector'

type DatavizHeaderProps = {
  parties: Party[]
  range: DatavizRange
  onRangeChange: (range: DatavizRange) => void
  umamiUrl: string | null
}

export function DatavizHeader({ parties, range, onRangeChange, umamiUrl }: DatavizHeaderProps) {
  return (
    <header className="w-full px-4 pt-12 pb-4 md:px-6 md:pt-16">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <h1>{adminDatavizCopy.title}</h1>
        {umamiUrl && (
          <a href={umamiUrl} target="_blank" rel="noreferrer" className="text-sm underline">
            {adminDatavizCopy.umamiLink}
          </a>
        )}
        <PartyRangeSelector parties={parties} range={range} onRangeChange={onRangeChange} />
      </div>
    </header>
  )
}
