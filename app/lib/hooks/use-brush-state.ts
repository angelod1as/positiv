import { useCallback, useEffect, useState } from 'react'

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
} | null {
  const fullRange = { startIndex: 0, endIndex: dataLength - 1 }

  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('startIndex' in parsed) ||
      !('endIndex' in parsed) ||
      typeof (parsed as Record<string, unknown>).startIndex !== 'number' ||
      typeof (parsed as Record<string, unknown>).endIndex !== 'number'
    ) {
      localStorage.removeItem(STORAGE_KEY)
      return fullRange
    }

    const { startIndex } = parsed as { startIndex: number; endIndex: number }
    let { endIndex } = parsed as { startIndex: number; endIndex: number }

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
  const [range, setRange] = useState({ startIndex: 0, endIndex: dataLength - 1 })

  useEffect(() => {
    const stored = readFromStorage(dataLength)
    if (stored) {
      setRange(stored)
    }
  }, [dataLength])

  const onChange = useCallback(
    (update: BrushRange) => {
      setRange((prev) => {
        const maxIndex = Math.max(dataLength - 1, 0)
        const start = Math.max(0, Math.min(update.startIndex ?? prev.startIndex, maxIndex))
        const end = Math.max(start, Math.min(update.endIndex ?? prev.endIndex, maxIndex))
        const next = { startIndex: start, endIndex: end }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        } catch {
          // localStorage unavailable
        }
        return next
      })
    },
    [dataLength]
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
