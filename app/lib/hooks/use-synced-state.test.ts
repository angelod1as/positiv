import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useSyncedState } from "./use-synced-state"

describe("useSyncedState", () => {
  it("should initialize with the prop value", () => {
    const { result } = renderHook(() => useSyncedState("initial"))

    expect(result.current[0]).toBe("initial")
  })

  it("should allow local state updates via setValue", () => {
    const { result } = renderHook(() => useSyncedState("initial"))

    act(() => {
      result.current[1]("updated locally")
    })

    expect(result.current[0]).toBe("updated locally")
  })

  it("should sync state when prop changes", () => {
    const { result, rerender } = renderHook(
      ({ prop }) => useSyncedState(prop),
      { initialProps: { prop: "initial" } }
    )

    expect(result.current[0]).toBe("initial")

    rerender({ prop: "updated from prop" })

    expect(result.current[0]).toBe("updated from prop")
  })

  it("should handle null values", () => {
    const { result, rerender } = renderHook(
      ({ prop }) => useSyncedState(prop),
      { initialProps: { prop: null as string | null } }
    )

    expect(result.current[0]).toBeNull()

    rerender({ prop: "now has value" })
    expect(result.current[0]).toBe("now has value")

    rerender({ prop: null })
    expect(result.current[0]).toBeNull()
  })

  it("should handle number values", () => {
    const { result, rerender } = renderHook(
      ({ prop }) => useSyncedState(prop),
      { initialProps: { prop: 100 } }
    )

    expect(result.current[0]).toBe(100)

    act(() => {
      result.current[1](200)
    })
    expect(result.current[0]).toBe(200)

    rerender({ prop: 300 })
    expect(result.current[0]).toBe(300)
  })

  it("should handle boolean values", () => {
    const { result, rerender } = renderHook(
      ({ prop }) => useSyncedState(prop),
      { initialProps: { prop: false } }
    )

    expect(result.current[0]).toBe(false)

    act(() => {
      result.current[1](true)
    })
    expect(result.current[0]).toBe(true)

    // Rerender with SAME prop value - local change persists
    rerender({ prop: false })
    expect(result.current[0]).toBe(true)

    // Rerender with DIFFERENT prop value - syncs to new value
    rerender({ prop: true })
    expect(result.current[0]).toBe(true)

    // Change prop to false - now it syncs
    rerender({ prop: false })
    expect(result.current[0]).toBe(false)
  })

  it("should not reset local changes until prop actually changes", () => {
    const { result, rerender } = renderHook(
      ({ prop }) => useSyncedState(prop),
      { initialProps: { prop: "initial" } }
    )

    // Make local change
    act(() => {
      result.current[1]("local change")
    })
    expect(result.current[0]).toBe("local change")

    // Rerender with SAME prop value - should keep local change
    rerender({ prop: "initial" })
    expect(result.current[0]).toBe("local change")

    // Rerender with DIFFERENT prop value - should sync
    rerender({ prop: "new prop value" })
    expect(result.current[0]).toBe("new prop value")
  })

  it("should work with complex objects", () => {
    const initialObj = { name: "test", value: 1 }
    const { result, rerender } = renderHook(
      ({ prop }) => useSyncedState(prop),
      { initialProps: { prop: initialObj } }
    )

    expect(result.current[0]).toEqual({ name: "test", value: 1 })

    const newObj = { name: "updated", value: 2 }
    rerender({ prop: newObj })
    expect(result.current[0]).toEqual({ name: "updated", value: 2 })
  })
})
