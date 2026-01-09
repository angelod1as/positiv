import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook } from "~/test/test-utils"
import { useSmartPrefetch } from "./use-smart-prefetch"

interface MockNetworkInformation extends EventTarget {
  effectiveType: "slow-2g" | "2g" | "3g" | "4g"
  saveData: boolean
}

describe("useSmartPrefetch", () => {
  let mockConnection: MockNetworkInformation

  beforeEach(() => {
    mockConnection = {
      effectiveType: "4g",
      saveData: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }

    Object.defineProperty(navigator, "connection", {
      configurable: true,
      writable: true,
      value: mockConnection,
    })
  })

  it("should return 'intent' for fast connections (4g)", () => {
    mockConnection.effectiveType = "4g"
    const { result } = renderHook(() => useSmartPrefetch())
    expect(result.current).toBe("intent")
  })

  it("should return 'intent' for moderate connections (3g)", () => {
    mockConnection.effectiveType = "3g"
    const { result } = renderHook(() => useSmartPrefetch())
    expect(result.current).toBe("intent")
  })

  it("should return 'none' for slow connections (2g)", () => {
    mockConnection.effectiveType = "2g"
    const { result } = renderHook(() => useSmartPrefetch())
    expect(result.current).toBe("none")
  })

  it("should return 'none' for very slow connections (slow-2g)", () => {
    mockConnection.effectiveType = "slow-2g"
    const { result } = renderHook(() => useSmartPrefetch())
    expect(result.current).toBe("none")
  })

  it("should return 'none' when data saver mode is enabled", () => {
    mockConnection.effectiveType = "4g"
    mockConnection.saveData = true
    const { result } = renderHook(() => useSmartPrefetch())
    expect(result.current).toBe("none")
  })

  it("should return 'none' when connection API is not available (Safari)", () => {
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      writable: true,
      value: undefined,
    })
    const { result } = renderHook(() => useSmartPrefetch())
    expect(result.current).toBe("none")
  })

  it("should register event listener for connection changes", () => {
    renderHook(() => useSmartPrefetch())
    expect(mockConnection.addEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    )
  })

  it("should cleanup event listener on unmount", () => {
    const { unmount } = renderHook(() => useSmartPrefetch())
    unmount()
    expect(mockConnection.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    )
  })
})
