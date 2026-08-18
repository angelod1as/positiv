import { demographicFilterCopy } from "~/copy/admin"

export type FilterMode = 'all' | 'attended'

interface DemographicFilterToggleProps {
  mode: FilterMode
  onModeChange: (mode: FilterMode) => void
}

export function DemographicFilterToggle({
  mode,
  onModeChange,
}: DemographicFilterToggleProps) {
  return (
    <div className="mb-4 flex justify-center gap-2">
      <button
        type="button"
        onClick={() => onModeChange('all')}
        data-active={mode === 'all'}
        className={`cursor-pointer rounded px-4 py-2 text-sm transition-colors ${
          mode === 'all'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        }`}
      >
        {demographicFilterCopy.all}
      </button>
      <button
        type="button"
        onClick={() => onModeChange('attended')}
        data-active={mode === 'attended'}
        className={`cursor-pointer rounded px-4 py-2 text-sm transition-colors ${
          mode === 'attended'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        }`}
      >
        {demographicFilterCopy.attended}
      </button>
    </div>
  )
}
