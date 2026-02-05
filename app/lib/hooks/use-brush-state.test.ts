import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBrushState } from './use-brush-state'

const STORAGE_KEY = 'dataviz-brush-events'

describe('useBrushState', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('returns full range when no localStorage exists', () => {
    const { result } = renderHook(() => useBrushState(5))

    expect(result.current.startIndex).toBe(0)
    expect(result.current.endIndex).toBe(4)
  })

  it('onChange updates the range', () => {
    const { result } = renderHook(() => useBrushState(10))

    act(() => {
      result.current.onChange({ startIndex: 2, endIndex: 7 })
    })

    expect(result.current.startIndex).toBe(2)
    expect(result.current.endIndex).toBe(7)
  })

  it('onChange persists to localStorage', () => {
    const { result } = renderHook(() => useBrushState(10))

    act(() => {
      result.current.onChange({ startIndex: 3, endIndex: 8 })
    })

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(stored).toEqual({ startIndex: 3, endIndex: 8 })
  })

  it('reads from localStorage on mount', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ startIndex: 2, endIndex: 6 })
    )

    const { result } = renderHook(() => useBrushState(10))

    expect(result.current.startIndex).toBe(2)
    expect(result.current.endIndex).toBe(6)
  })

  it('clamps when data shrinks below stored endIndex', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ startIndex: 3, endIndex: 10 })
    )

    const { result } = renderHook(() => useBrushState(5))

    expect(result.current.startIndex).toBe(3)
    expect(result.current.endIndex).toBe(4)
  })

  it('clamps startIndex when it exceeds new data length', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ startIndex: 8, endIndex: 10 })
    )

    const { result } = renderHook(() => useBrushState(5))

    expect(result.current.startIndex).toBe(0)
    expect(result.current.endIndex).toBe(4)
  })

  it('handles corrupted JSON in localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{')

    const { result } = renderHook(() => useBrushState(5))

    expect(result.current.startIndex).toBe(0)
    expect(result.current.endIndex).toBe(4)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('reset clears localStorage and returns to full range', () => {
    const { result } = renderHook(() => useBrushState(10))

    act(() => {
      result.current.onChange({ startIndex: 3, endIndex: 7 })
    })

    expect(result.current.startIndex).toBe(3)

    act(() => {
      result.current.reset()
    })

    expect(result.current.startIndex).toBe(0)
    expect(result.current.endIndex).toBe(9)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('returns 0/-1 for empty data', () => {
    const { result } = renderHook(() => useBrushState(0))

    expect(result.current.startIndex).toBe(0)
    expect(result.current.endIndex).toBe(-1)
  })

  it('handles partial onChange with only startIndex', () => {
    const { result } = renderHook(() => useBrushState(10))

    act(() => {
      result.current.onChange({ startIndex: 3 })
    })

    expect(result.current.startIndex).toBe(3)
    expect(result.current.endIndex).toBe(9)
  })

  it('handles partial onChange with only endIndex', () => {
    const { result } = renderHook(() => useBrushState(10))

    act(() => {
      result.current.onChange({ endIndex: 5 })
    })

    expect(result.current.startIndex).toBe(0)
    expect(result.current.endIndex).toBe(5)
  })

  it('clamps negative startIndex to 0', () => {
    const { result } = renderHook(() => useBrushState(10))

    act(() => {
      result.current.onChange({ startIndex: -3, endIndex: 5 })
    })

    expect(result.current.startIndex).toBe(0)
    expect(result.current.endIndex).toBe(5)
  })

  it('clamps endIndex exceeding data length', () => {
    const { result } = renderHook(() => useBrushState(5))

    act(() => {
      result.current.onChange({ startIndex: 1, endIndex: 20 })
    })

    expect(result.current.startIndex).toBe(1)
    expect(result.current.endIndex).toBe(4)
  })

  it('ensures endIndex is never less than startIndex', () => {
    const { result } = renderHook(() => useBrushState(10))

    act(() => {
      result.current.onChange({ startIndex: 7, endIndex: 3 })
    })

    expect(result.current.startIndex).toBe(7)
    expect(result.current.endIndex).toBe(7)
  })

  it('handles non-object localStorage value gracefully', () => {
    localStorage.setItem(STORAGE_KEY, '42')

    const { result } = renderHook(() => useBrushState(5))

    expect(result.current.startIndex).toBe(0)
    expect(result.current.endIndex).toBe(4)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('handles localStorage array value gracefully', () => {
    localStorage.setItem(STORAGE_KEY, '[1, 2, 3]')

    const { result } = renderHook(() => useBrushState(5))

    expect(result.current.startIndex).toBe(0)
    expect(result.current.endIndex).toBe(4)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
