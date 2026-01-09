import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render } from "~/test/test-utils"
import type { FilterConfig } from "./use-table-filters"
import { useTableFilters } from "./use-table-filters"

// Mock dependencies
vi.mock("~/lib/hooks/use-multi-filter-manager", () => ({
  createFilterTemplates: vi.fn((configs, _setters) => {
    const templates: Record<string, () => null> = {}
    Object.keys(configs).forEach((field) => {
      templates[field] = () => null
    })
    return templates
  }),
  createOnFilterHandler: vi.fn((_configs, _setters) => vi.fn()),
  useFilterState: vi.fn((configs, values) => ({
    global: { value: null, matchMode: "contains" },
    ...Object.keys(configs).reduce(
      (acc, field) => {
        acc[field] = {
          value: values[field] || [],
          matchMode: configs[field].matchMode,
        }
        return acc
      },
      {} as Record<string, unknown>,
    ),
  })),
}))

const mockSessionStorage = new Map<string, string>()

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(window, "sessionStorage", {
    value: {
      getItem: vi.fn((key: string) => mockSessionStorage.get(key) || null),
      setItem: vi.fn((key: string, value: string) => {
        mockSessionStorage.set(key, value)
      }),
      removeItem: vi.fn((key: string) => {
        mockSessionStorage.delete(key)
      }),
      clear: vi.fn(() => {
        mockSessionStorage.clear()
      }),
    },
    writable: true,
    configurable: true,
  })
})

afterEach(() => {
  vi.clearAllMocks()
  mockSessionStorage.clear()
})

// Test component to use the hook
function TestComponent<T>({
  configs,
  filterStates,
  data,
  dynamicOptions,
  onResult,
}: {
  configs: Record<string, FilterConfig>
  filterStates: Record<string, [string[], (value: string[]) => void]>
  data?: T[]
  dynamicOptions?: Record<
    string,
    (data: T[]) => Array<{ name: string; value: string; label?: string }>
  >
  onResult: (result: ReturnType<typeof useTableFilters>) => void
}) {
  const result = useTableFilters(configs, filterStates, data, dynamicOptions)
  onResult(result)
  return <div>Test Component</div>
}

describe("useTableFilters", () => {
  it("should initialize with provided filter configs", () => {
    const configs = {
      status: {
        storageKey: "test-status",
        options: [{ name: "Active", value: "active", label: "Active" }],
        matchMode: "in",
        allValues: ["active", "inactive"],
        defaultSelected: ["active"],
      },
    }

    const setStatusFilter = vi.fn()
    const filterStates = {
      status: [["active"], setStatusFilter] as [
        string[],
        (value: string[]) => void,
      ],
    }

    let result: ReturnType<typeof useTableFilters> | undefined

    render(
      <TestComponent
        configs={configs}
        filterStates={filterStates}
        onResult={(r) => {
          result = r
        }}
      />,
    )

    expect(result).toBeDefined()
    if (!result) throw new Error("Result should be defined")
    if (!result) throw new Error("Result should be defined")
    expect(result.filters).toBeDefined()
    expect(result.filterTemplates).toBeDefined()
    expect(result.filterTemplates.status).toBeDefined()
    expect(result.handleFilter).toBeDefined()
    expect(result.handleClearFilters).toBeDefined()
  })

  it("should compute dynamic options from data", () => {
    const configs = {
      gender: {
        storageKey: "test-gender",
        options: [],
        matchMode: "in",
        allValues: [],
      },
    }

    const data = [
      { id: "1", gender: "Male" },
      { id: "2", gender: "Female" },
      { id: "3", gender: "Male" },
    ]

    type GenderData = { id: string; gender: string }

    const genderOptions = (data: GenderData[]) => {
      const unique = [...new Set(data.map((d) => d.gender))]
      return unique.map((g) => ({ name: g, value: g, label: g }))
    }

    const setGenderFilter = vi.fn()
    const filterStates = {
      gender: [[], setGenderFilter] as [string[], (value: string[]) => void],
    }

    let result: ReturnType<typeof useTableFilters> | undefined

    render(
      <TestComponent
        configs={configs}
        filterStates={filterStates}
        data={data}
        dynamicOptions={{ gender: genderOptions }}
        onResult={(r) => {
          result = r
        }}
      />,
    )

    expect(result).toBeDefined()
    if (!result) throw new Error("Result should be defined")
    expect(result.filterTemplates.gender).toBeDefined()
  })

  it("should work without dynamic options", () => {
    const configs = {
      status: {
        storageKey: "test-status",
        options: [
          { name: "Active", value: "active", label: "Active" },
          { name: "Inactive", value: "inactive", label: "Inactive" },
        ],
        matchMode: "in",
        allValues: ["active", "inactive"],
      },
    }

    const setStatusFilter = vi.fn()
    const filterStates = {
      status: [["active"], setStatusFilter] as [
        string[],
        (value: string[]) => void,
      ],
    }

    let result: ReturnType<typeof useTableFilters> | undefined

    render(
      <TestComponent
        configs={configs}
        filterStates={filterStates}
        onResult={(r) => {
          result = r
        }}
      />,
    )

    expect(result).toBeDefined()
    if (!result) throw new Error("Result should be defined")
    expect(result.filters).toBeDefined()
    expect(result.filterTemplates).toBeDefined()
  })

  it("should clear all filters and remove from sessionStorage", () => {
    const configs = {
      status: {
        storageKey: "test-status",
        options: [{ name: "Active", value: "active", label: "Active" }],
        matchMode: "in",
        allValues: ["active", "inactive"],
      },
      category: {
        storageKey: "test-category",
        options: [{ name: "Tech", value: "tech", label: "Tech" }],
        matchMode: "in",
        allValues: ["tech", "business"],
      },
    }

    mockSessionStorage.set("test-status", JSON.stringify(["active"]))
    mockSessionStorage.set("test-category", JSON.stringify(["tech"]))

    const setStatusFilter = vi.fn()
    const setCategoryFilter = vi.fn()
    const filterStates = {
      status: [["active"], setStatusFilter] as [
        string[],
        (value: string[]) => void,
      ],
      category: [["tech"], setCategoryFilter] as [
        string[],
        (value: string[]) => void,
      ],
    }

    let result: ReturnType<typeof useTableFilters> | undefined

    render(
      <TestComponent
        configs={configs}
        filterStates={filterStates}
        onResult={(r) => {
          result = r
        }}
      />,
    )

    result?.handleClearFilters()

    expect(setStatusFilter).toHaveBeenCalledWith([])
    expect(setCategoryFilter).toHaveBeenCalledWith([])
    expect(window.sessionStorage.removeItem).toHaveBeenCalledWith("test-status")
    expect(window.sessionStorage.removeItem).toHaveBeenCalledWith(
      "test-category",
    )
  })

  it("should handle multiple filters with different values", () => {
    const configs = {
      status: {
        storageKey: "test-status",
        options: [{ name: "Active", value: "active", label: "Active" }],
        matchMode: "custom_status",
        allValues: ["active", "inactive"],
      },
      priority: {
        storageKey: "test-priority",
        options: [{ name: "High", value: "high", label: "High" }],
        matchMode: "custom_priority",
        allValues: ["high", "medium", "low"],
      },
    }

    const setStatusFilter = vi.fn()
    const setPriorityFilter = vi.fn()
    const filterStates = {
      status: [["active"], setStatusFilter] as [
        string[],
        (value: string[]) => void,
      ],
      priority: [["high", "medium"], setPriorityFilter] as [
        string[],
        (value: string[]) => void,
      ],
    }

    let result: ReturnType<typeof useTableFilters> | undefined

    render(
      <TestComponent
        configs={configs}
        filterStates={filterStates}
        onResult={(r) => {
          result = r
        }}
      />,
    )

    expect(result).toBeDefined()
    if (!result) throw new Error("Result should be defined")
    expect(result.filterTemplates.status).toBeDefined()
    expect(result.filterTemplates.priority).toBeDefined()
    expect(result.filters).toBeDefined()
  })

  it("should handle empty data array", () => {
    const configs = {
      gender: {
        storageKey: "test-gender",
        options: [],
        matchMode: "in",
        allValues: [],
      },
    }

    const genderOptions = (data: Array<{ gender: string }>) => {
      const unique = [...new Set(data.map((d) => d.gender))]
      return unique.map((g) => ({ name: g, value: g, label: g }))
    }

    const setGenderFilter = vi.fn()
    const filterStates = {
      gender: [[], setGenderFilter] as [string[], (value: string[]) => void],
    }

    let result: ReturnType<typeof useTableFilters> | undefined

    render(
      <TestComponent
        configs={configs}
        filterStates={filterStates}
        data={[]}
        dynamicOptions={{ gender: genderOptions }}
        onResult={(r) => {
          result = r
        }}
      />,
    )

    expect(result).toBeDefined()
    if (!result) throw new Error("Result should be defined")
    expect(result.filterTemplates.gender).toBeDefined()
  })
})
