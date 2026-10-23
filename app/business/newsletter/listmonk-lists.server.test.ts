import {
  describe,
  expect,
  it,
  vi,
  beforeEach,
  afterEach,
  type MockInstance,
} from "vitest"
import {
  createList,
  deleteList,
  getListById,
  getListSubscribers,
} from "./listmonk-lists.server"

vi.mock("varlock/env", () => ({
  ENV: {
    LISTMONK_API_URL: "https://listmonk.test",
    LISTMONK_API_USERNAME: "testuser",
    LISTMONK_API_PASSWORD: "testpass",
  },
}))

describe("createList", () => {
  let fetchSpy: MockInstance

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch")
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    vi.clearAllMocks()
  })

  it("should create a list with correct data", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: 123,
          uuid: "abc-123",
          name: "Candidates - Test Event",
          type: "private",
          optin: "single",
          tags: [],
          subscriber_count: 0,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      }),
    } as Response)

    const result = await createList({
      name: "Candidates - Test Event",
      type: "private",
      optin: "single",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe(123)
      expect(result.data.name).toBe("Candidates - Test Event")
    }
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://listmonk.test/api/lists",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Basic dGVzdHVzZXI6dGVzdHBhc3M=",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          name: "Candidates - Test Event",
          type: "private",
          optin: "single",
        }),
      })
    )
  })

  it("should create a list with optional description and tags", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: 456,
          uuid: "def-456",
          name: "Candidates - Another Event",
          type: "private",
          optin: "single",
          tags: ["event", "2024"],
          subscriber_count: 0,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      }),
    } as Response)

    const result = await createList({
      name: "Candidates - Another Event",
      type: "private",
      optin: "single",
      description: "List for event participants",
      tags: ["event", "2024"],
    })

    expect(result.success).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://listmonk.test/api/lists",
      expect.objectContaining({
        body: JSON.stringify({
          name: "Candidates - Another Event",
          type: "private",
          optin: "single",
          description: "List for event participants",
          tags: ["event", "2024"],
        }),
      })
    )
  })

  it("should fail when API returns error", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => "List name already exists",
    } as Response)

    const result = await createList({
      name: "Duplicate List",
      type: "private",
      optin: "single",
    })

    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()
  })

  it("should fail when network error occurs", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"))

    const result = await createList({
      name: "Test List",
      type: "private",
      optin: "single",
    })

    expect(result.success).toBe(false)
  })

  it("should fail when credentials are missing", async () => {
    const { ENV } = await import("varlock/env")
    const configured = { ...ENV }
    Object.assign(ENV, {
      LISTMONK_API_URL: undefined,
      LISTMONK_API_USERNAME: undefined,
      LISTMONK_API_PASSWORD: undefined,
    })

    let result
    try {
      result = await createList({
        name: "Test List",
        type: "private",
        optin: "single",
      })
    } finally {
      Object.assign(ENV, configured)
    }

    expect(result.success).toBe(false)
  })
})

describe("deleteList", () => {
  let fetchSpy: MockInstance

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch")
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    vi.clearAllMocks()
  })

  it("should delete a list by ID", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ data: true }),
    } as Response)

    const result = await deleteList(123)

    expect(result.success).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://listmonk.test/api/lists/123",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          Authorization: "Basic dGVzdHVzZXI6dGVzdHBhc3M=",
        }),
      })
    )
  })

  it("should handle 404 gracefully when list does not exist", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () => "List not found",
    } as Response)

    const result = await deleteList(999)

    expect(result.success).toBe(true)
  })

  it("should fail when API returns other errors", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => "Database error",
    } as Response)

    const result = await deleteList(123)

    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()
  })

  it("should fail when network error occurs", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"))

    const result = await deleteList(123)

    expect(result.success).toBe(false)
  })
})

describe("getListById", () => {
  let fetchSpy: MockInstance

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch")
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    vi.clearAllMocks()
  })

  it("should retrieve a list by ID", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: 123,
          uuid: "abc-123",
          name: "Candidates - Test Event",
          type: "private",
          optin: "single",
          tags: [],
          subscriber_count: 42,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      }),
    } as Response)

    const result = await getListById(123)

    expect(result.success).toBe(true)
    if (result.success && result.data) {
      expect(result.data.id).toBe(123)
      expect(result.data.name).toBe("Candidates - Test Event")
      expect(result.data.subscriber_count).toBe(42)
    }
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://listmonk.test/api/lists/123",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Basic dGVzdHVzZXI6dGVzdHBhc3M=",
        }),
      })
    )
  })

  it("should return null data when list is not found", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () => "List not found",
    } as Response)

    const result = await getListById(999)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBeNull()
    }
  })

  it("should fail when API returns other errors", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => "Database error",
    } as Response)

    const result = await getListById(123)

    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()
  })

  it("should fail when network error occurs", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"))

    const result = await getListById(123)

    expect(result.success).toBe(false)
  })
})

describe("getListSubscribers", () => {
  let fetchSpy: MockInstance

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { results: [], total: 0, page: 1, per_page: 100 },
      }),
    } as Response)
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    vi.clearAllMocks()
  })

  const requestedQuery = () =>
    decodeURIComponent(String(fetchSpy.mock.calls[0][0]))

  it("should read active memberships by default", async () => {
    await getListSubscribers(141)

    expect(requestedQuery()).toContain(
      "WHERE list_id = 141 AND status != 'unsubscribed'",
    )
  })

  const page = (ids: number[], total: number) =>
    ({
      ok: true,
      json: async () => ({
        data: {
          results: ids.map((id) => ({
            id,
            email: `s${id}@example.com`,
            name: `s${id}`,
            status: "enabled",
          })),
          total,
          page: 1,
          per_page: 100,
        },
      }),
    }) as Response

  const range = (from: number, count: number) =>
    Array.from({ length: count }, (_, i) => from + i)

  it("should read every page until Listmonk's total is reached", async () => {
    fetchSpy
      .mockResolvedValueOnce(page(range(1, 100), 150))
      .mockResolvedValueOnce(page(range(101, 50), 150))

    const result = await getListSubscribers(141)

    expect(result.success).toBe(true)
    expect(result.success && result.data).toHaveLength(150)
  })

  it("should fail when the pages return fewer subscribers than Listmonk's total", async () => {
    fetchSpy
      .mockResolvedValueOnce(page(range(1, 100), 250))
      .mockResolvedValueOnce(page(range(101, 50), 250))

    const result = await getListSubscribers(141)

    expect(result.success).toBe(false)
  })

  it("should read only unsubscribed memberships when asked", async () => {
    await getListSubscribers(141, "unsubscribed")

    expect(requestedQuery()).toContain(
      "WHERE list_id = 141 AND status = 'unsubscribed'",
    )
  })
})
