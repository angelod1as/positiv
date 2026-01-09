import { renderHook, act } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { useGridState } from "./use-grid-state"
import type { GridApi, GridState } from "ag-grid-community"

const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      const { [key]: _, ...rest } = store
      store = rest
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get store() {
      return store
    },
  }
})()

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
})

const createMockGridApi = (): Partial<GridApi> => ({
  setState: vi.fn(),
  getState: vi.fn(() => ({
    filter: {},
    columnOrder: { orderedColIds: ["col1", "col2"] },
    sort: { sortModel: [] },
  })),
})

describe("useGridState", () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("initialization", () => {
    it("should initialize with isRestored as false", () => {
      const { result } = renderHook(() =>
        useGridState("test-table", { version: 1 })
      )

      expect(result.current.isRestored).toBe(false)
    })

    it("should return restoreState, saveState, and clearState functions", () => {
      const { result } = renderHook(() =>
        useGridState("test-table", { version: 1 })
      )

      expect(typeof result.current.restoreState).toBe("function")
      expect(typeof result.current.saveState).toBe("function")
      expect(typeof result.current.clearState).toBe("function")
    })
  })

  describe("restoreState", () => {
    it("should restore state from localStorage when version matches", () => {
      const mockState = {
        filter: { status: { filterType: "text", filter: "active" } },
        columnOrder: { orderedColIds: ["col1", "col2"] },
        sort: { sortModel: [{ colId: "name", sort: "asc" }] },
      } as unknown as GridState

      const storedState = {
        version: 1,
        savedAt: Date.now(),
        gridState: mockState,
      }

      mockLocalStorage.setItem(
        "ag-grid-state-test-table",
        JSON.stringify(storedState)
      )

      const mockApi = createMockGridApi()
      const { result } = renderHook(() =>
        useGridState("test-table", { version: 1 })
      )

      act(() => {
        result.current.restoreState(mockApi as GridApi)
      })

      expect(mockApi.setState).toHaveBeenCalledWith(mockState)
      expect(result.current.isRestored).toBe(true)
    })

    it("should not restore state when version does not match", () => {
      const storedState = {
        version: 1,
        savedAt: Date.now(),
        gridState: { filter: {} },
      }

      mockLocalStorage.setItem(
        "ag-grid-state-test-table",
        JSON.stringify(storedState)
      )

      const mockApi = createMockGridApi()
      const { result } = renderHook(() =>
        useGridState("test-table", { version: 2 })
      )

      act(() => {
        result.current.restoreState(mockApi as GridApi)
      })

      expect(mockApi.setState).not.toHaveBeenCalled()
      expect(result.current.isRestored).toBe(true)
    })

    it("should handle corrupted JSON gracefully", () => {
      mockLocalStorage.setItem("ag-grid-state-test-table", "invalid json{{{")

      const mockApi = createMockGridApi()
      const { result } = renderHook(() =>
        useGridState("test-table", { version: 1 })
      )

      act(() => {
        result.current.restoreState(mockApi as GridApi)
      })

      expect(mockApi.setState).not.toHaveBeenCalled()
      expect(result.current.isRestored).toBe(true)
    })

    it("should handle missing storage gracefully", () => {
      const mockApi = createMockGridApi()
      const { result } = renderHook(() =>
        useGridState("test-table", { version: 1 })
      )

      act(() => {
        result.current.restoreState(mockApi as GridApi)
      })

      expect(mockApi.setState).not.toHaveBeenCalled()
      expect(result.current.isRestored).toBe(true)
    })

    it("should clear corrupted state from storage", () => {
      mockLocalStorage.setItem("ag-grid-state-test-table", "invalid json")

      const mockApi = createMockGridApi()
      const { result } = renderHook(() =>
        useGridState("test-table", { version: 1 })
      )

      act(() => {
        result.current.restoreState(mockApi as GridApi)
      })

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        "ag-grid-state-test-table"
      )
    })

    it("should not clear storage when api.setState throws non-parse error", () => {
      const mockState = {
        filter: { status: { filterType: "text" } },
        columnOrder: { orderedColIds: ["col1"] },
        sort: { sortModel: [] },
      } as unknown as GridState

      const storedState = {
        version: 1,
        savedAt: Date.now(),
        gridState: mockState,
      }

      mockLocalStorage.setItem(
        "ag-grid-state-test-table",
        JSON.stringify(storedState)
      )

      const mockApi = {
        ...createMockGridApi(),
        setState: vi.fn(() => {
          throw new Error("Grid API error")
        }),
      }

      const { result } = renderHook(() =>
        useGridState("test-table", { version: 1 })
      )

      act(() => {
        result.current.restoreState(mockApi as unknown as GridApi)
      })

      // Storage should NOT be cleared when api.setState fails (only on parse errors)
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled()
      expect(result.current.isRestored).toBe(true)
    })
  })

  describe("saveState", () => {
    it("should save state to localStorage with correct format", () => {
      const { result } = renderHook(() =>
        useGridState("test-table", { version: 1 })
      )

      const mockState = {
        filter: { status: { filterType: "text" } },
        columnOrder: { orderedColIds: ["col1"] },
        sort: { sortModel: [] },
      } as unknown as GridState

      act(() => {
        result.current.saveState(mockState)
        vi.advanceTimersByTime(500)
      })

      const savedData = JSON.parse(
        mockLocalStorage.store["ag-grid-state-test-table"]
      )

      expect(savedData.version).toBe(1)
      expect(savedData.gridState).toEqual(mockState)
      expect(savedData.savedAt).toBeDefined()
    })

    it("should debounce multiple rapid saves", () => {
      const { result } = renderHook(() =>
        useGridState("test-table", { version: 1, debounceMs: 300 })
      )

      const state1 = { filter: { a: 1 } } as unknown as GridState
      const state2 = { filter: { b: 2 } } as unknown as GridState
      const state3 = { filter: { c: 3 } } as unknown as GridState

      act(() => {
        result.current.saveState(state1)
        vi.advanceTimersByTime(100)
        result.current.saveState(state2)
        vi.advanceTimersByTime(100)
        result.current.saveState(state3)
        vi.advanceTimersByTime(300)
      })

      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1)
      const savedData = JSON.parse(
        mockLocalStorage.store["ag-grid-state-test-table"]
      )
      expect(savedData.gridState).toEqual(state3)
    })

    it("should use custom debounce delay", () => {
      const { result } = renderHook(() =>
        useGridState("test-table", { version: 1, debounceMs: 1000 })
      )

      const mockState = { filter: {} } as unknown as GridState

      act(() => {
        result.current.saveState(mockState)
        vi.advanceTimersByTime(500)
      })

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(mockLocalStorage.setItem).toHaveBeenCalled()
    })
  })

  describe("clearState", () => {
    it("should remove state from localStorage", () => {
      mockLocalStorage.setItem(
        "ag-grid-state-test-table",
        JSON.stringify({ version: 1, gridState: {} })
      )

      const { result } = renderHook(() =>
        useGridState("test-table", { version: 1 })
      )

      act(() => {
        result.current.clearState()
      })

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        "ag-grid-state-test-table"
      )
    })

    it("should cancel pending debounced save to prevent race condition", () => {
      const { result } = renderHook(() =>
        useGridState("test-table", { version: 1, debounceMs: 500 })
      )

      const mockState = { filter: { test: true } } as unknown as GridState

      act(() => {
        result.current.saveState(mockState)
        // Don't advance timers - save is still pending
      })

      act(() => {
        result.current.clearState()
      })

      // Now advance timers past the debounce delay
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Save should NOT have been called because clearState cancelled the pending timer
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        "ag-grid-state-test-table"
      )
    })
  })

  describe("storage key generation", () => {
    it("should use table id in storage key", () => {
      const { result } = renderHook(() =>
        useGridState("my-unique-table", { version: 1 })
      )

      const mockState = { filter: {} } as unknown as GridState

      act(() => {
        result.current.saveState(mockState)
        vi.advanceTimersByTime(500)
      })

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        "ag-grid-state-my-unique-table",
        expect.any(String)
      )
    })
  })

  describe("cleanup", () => {
    it("should cleanup debounce timer on unmount to prevent memory leaks", () => {
      const { result, unmount } = renderHook(() =>
        useGridState("test-table", { version: 1, debounceMs: 500 })
      )

      const mockState = { filter: { test: true } } as unknown as GridState

      act(() => {
        result.current.saveState(mockState)
        // Don't advance timers - save is still pending
      })

      // Unmount the hook
      unmount()

      // Now advance timers past the debounce delay
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Save should NOT have been called because unmount cancelled the pending timer
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
    })
  })

  describe("version invalidation", () => {
    it("should discard state when stored version is lower than current", () => {
      const storedState = {
        version: 1,
        savedAt: Date.now(),
        gridState: { filter: { old: true } },
      }

      mockLocalStorage.setItem(
        "ag-grid-state-test-table",
        JSON.stringify(storedState)
      )

      const mockApi = createMockGridApi()
      const { result } = renderHook(() =>
        useGridState("test-table", { version: 2 })
      )

      act(() => {
        result.current.restoreState(mockApi as GridApi)
      })

      expect(mockApi.setState).not.toHaveBeenCalled()
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        "ag-grid-state-test-table"
      )
    })
  })
})
