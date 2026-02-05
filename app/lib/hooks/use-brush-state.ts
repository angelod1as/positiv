import { useCallback, useState } from 'react'

const STORAGE_KEY = 'dataviz-brush-events'

interface BrushRange {
  startIndex?: number
  endIndex?: number
}

interface UseBrushStateReturn {
  startIndex: number
  endIndex: number
  onChange: (range: BrushRange) => void
  reset: () => void
}

function readFromStorage(dataLength: number): {
  startIndex: number
  endIndex: number
} {
  const fullRange = { startIndex: 0, endIndex: dataLength - 1 }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fullRange

    const parsed = JSON.parse(raw)
    let { startIndex, endIndex } = parsed as {
      startIndex: number
      endIndex: number
    }

    if (
      typeof startIndex !== 'number' ||
      typeof endIndex !== 'number'
    ) {
      localStorage.removeItem(STORAGE_KEY)
      return fullRange
    }

    if (startIndex >= dataLength) {
      return fullRange
    }

    if (endIndex >= dataLength) {
      endIndex = dataLength - 1
    }

    return { startIndex, endIndex }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return fullRange
  }
}

export function useBrushState(dataLength: number): UseBrushStateReturn {
  const [range, setRange] = useState(() => readFromStorage(dataLength))

  const onChange = useCallback(
    (update: BrushRange) => {
      setRange((prev) => {
        const next = {
          startIndex: update.startIndex ?? prev.startIndex,
          endIndex: update.endIndex ?? prev.endIndex,
        }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        } catch {
          // localStorage unavailable
        }
        return next
      })
    },
    []
  )

  const reset = useCallback(() => {
    setRange({ startIndex: 0, endIndex: dataLength - 1 })
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // localStorage unavailable
    }
  }, [dataLength])

  return {
    startIndex: range.startIndex,
    endIndex: range.endIndex,
    onChange,
    reset,
  }
}
