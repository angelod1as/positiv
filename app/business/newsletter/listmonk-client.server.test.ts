import { describe, expect, it, vi, beforeEach, afterEach, type MockInstance } from "vitest"
import {
  testConnection,
  addSubscriber,
  removeSubscriber,
  createCampaign,
  updateCampaignStatus,
} from "./listmonk-client.server"

vi.mock("~/env.server", () => ({
  env: vi.fn(() => ({
    listmonkApiUrl: "https://listmonk.test",
    listmonkApiUsername: "testuser",
    listmonkApiPassword: "testpass",
  })),
}))

describe("testConnection", () => {
  let fetchSpy: MockInstance

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch")
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    vi.clearAllMocks()
  })

  it("should make a request with correct BasicAuth header", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response)

    const result = await testConnection()

    expect(result.success).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://listmonk.test/api/subscribers",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Basic dGVzdHVzZXI6dGVzdHBhc3M=", // base64 of "testuser:testpass"
        }),
      })
    )
  })

  it("should fail when credentials are missing", async () => {
    const { env } = await import("~/env.server")
    vi.mocked(env).mockReturnValueOnce({
      listmonkApiUrl: undefined,
      listmonkApiUsername: undefined,
      listmonkApiPassword: undefined,
    } as ReturnType<typeof env>)

    const result = await testConnection()

    expect(result.success).toBe(false)
  })
})

describe("addSubscriber", () => {
  let fetchSpy: MockInstance
  let consoleSpy: MockInstance

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch")
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    consoleSpy.mockRestore()
    vi.clearAllMocks()
  })

  it("should add a subscriber with correct data", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { results: [] } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 123 } }),
      } as Response)

    const result = await addSubscriber({
      email: "test@example.com",
      name: "Test User",
      lists: [1, 2],
      attributes: {
        profile_id: "abc-123",
        custom_field: "value",
      },
    })

    expect(result.success).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://listmonk.test/api/subscribers",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Basic dGVzdHVzZXI6dGVzdHBhc3M=",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          email: "test@example.com",
          name: "Test User",
          lists: [1, 2],
          attribs: {
            profile_id: "abc-123",
            custom_field: "value",
          },
        }),
      })
    )
  })

  it("should fail when API returns error for new subscriber", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { results: [] } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response)

    const result = await addSubscriber({
      email: "test@example.com",
      name: "Test User",
      lists: [1],
      attributes: {},
    })

    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()
  })

  it("should fail when network error occurs", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"))

    const result = await addSubscriber({
      email: "test@example.com",
      name: "Test User",
      lists: [1],
      attributes: {},
    })

    expect(result.success).toBe(false)
  })

  it("should handle 409 Conflict by checking if subscriber exists first", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { results: [{ id: 456, email: "existing@example.com", lists: [{ id: 1 }], attribs: {} }] } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 456 } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

    const result = await addSubscriber({
      email: "existing@example.com",
      name: "Existing User",
      lists: [4],
      attributes: { profile_id: "def-456" },
    })

    expect(result.success).toBe(true)
    const expectedEncodedQuery = encodeURIComponent("subscribers.email ILIKE 'existing@example.com'")
    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      `https://listmonk.test/api/subscribers?query=${expectedEncodedQuery}`,
      expect.objectContaining({
        method: "GET",
      })
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      "https://listmonk.test/api/subscribers/456",
      expect.objectContaining({
        method: "PUT",
        body: expect.stringContaining('"profile_id":"def-456"'),
      })
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      "https://listmonk.test/api/subscribers/lists",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          ids: [456],
          action: "add",
          target_list_ids: [4],
          status: "confirmed",
        }),
      })
    )
    expect(fetchSpy).toHaveBeenCalledTimes(3)
  })

  it("should create new subscriber when email does not exist", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { results: [] } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 789 } }),
      } as Response)

    const result = await addSubscriber({
      email: "new@example.com",
      name: "New User",
      lists: [4],
      attributes: { profile_id: "ghi-789" },
    })

    expect(result.success).toBe(true)
    const expectedEncodedQuery = encodeURIComponent("subscribers.email ILIKE 'new@example.com'")
    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      `https://listmonk.test/api/subscribers?query=${expectedEncodedQuery}`,
      expect.objectContaining({
        method: "GET",
      })
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      "https://listmonk.test/api/subscribers",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "new@example.com",
          name: "New User",
          lists: [4],
          attribs: { profile_id: "ghi-789" },
        }),
      })
    )
  })

  it("should preserve existing lists when adding subscriber to new lists", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            results: [
              { id: 456, email: "existing@example.com", lists: [{ id: 1 }, { id: 2 }], attribs: {} },
            ],
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 456 } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

    const result = await addSubscriber({
      email: "existing@example.com",
      name: "Existing User",
      lists: [4],
      attributes: { profile_id: "def-456" },
    })

    expect(result.success).toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(3)

    const listCall = fetchSpy.mock.calls.find(
      (call) => call[0] === "https://listmonk.test/api/subscribers/lists"
    )
    expect(listCall).toBeDefined()
    const listBody = JSON.parse(listCall?.[1]?.body as string)
    expect(listBody).toEqual({
      ids: [456],
      action: "add",
      target_list_ids: [4],
      status: "confirmed",
    })
  })

  it("should escape single quotes in email addresses for API query", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { results: [] } }),
    } as Response)

    await addSubscriber({
      email: "o'connor@example.com",
      name: "Test User",
      lists: [1],
      attributes: {},
    })

    const expectedEncodedQuery = encodeURIComponent("subscribers.email ILIKE 'o''connor@example.com'")
    expect(fetchSpy).toHaveBeenCalledWith(
      `https://listmonk.test/api/subscribers?query=${expectedEncodedQuery}`,
      expect.objectContaining({
        method: "GET",
      })
    )
  })

  it("should URL-encode the query parameter", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { results: [] } }),
    } as Response)

    await addSubscriber({
      email: "test@example.com",
      name: "Test User",
      lists: [1],
      attributes: {},
    })

    // The query parameter should be URL-encoded
    const expectedEncodedQuery = encodeURIComponent("subscribers.email ILIKE 'test@example.com'")
    expect(fetchSpy).toHaveBeenCalledWith(
      `https://listmonk.test/api/subscribers?query=${expectedEncodedQuery}`,
      expect.objectContaining({
        method: "GET",
      })
    )
  })

  it("should throw error when subscriber lookup fails", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    } as Response)

    const result = await addSubscriber({
      email: "test@example.com",
      name: "Test User",
      lists: [1],
      attributes: {},
    })

    expect(result.success).toBe(false)
    expect(result.errors?.[0]?.message).toContain("Failed to query subscriber")
  })

  it("should merge existing attributes when updating subscriber", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            results: [
              {
                id: 456,
                email: "existing@example.com",
                lists: [{ id: 1 }],
                attribs: {
                  existing_field: "old_value",
                  another_field: "keep_this",
                },
              },
            ],
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 456 } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

    const result = await addSubscriber({
      email: "existing@example.com",
      name: "Updated User",
      lists: [1],
      attributes: {
        existing_field: "new_value",
        new_field: "added",
      },
    })

    expect(result.success).toBe(true)
    const updateCall = fetchSpy.mock.calls.find(
      (call) => call[0] === "https://listmonk.test/api/subscribers/456"
    )
    expect(updateCall).toBeDefined()
    const updateBody = JSON.parse(updateCall?.[1]?.body as string)
    expect(updateBody.attribs).toEqual({
      existing_field: "new_value",
      another_field: "keep_this",
      new_field: "added",
    })
  })

  it("should use dedicated list management endpoint for additive list subscriptions", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            results: [
              {
                id: 789,
                email: "user@example.com",
                lists: [{ id: 1 }, { id: 2 }],
                attribs: { profile_id: "abc-123" },
              },
            ],
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 789 } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

    const result = await addSubscriber({
      email: "user@example.com",
      name: "Test User",
      lists: [4],
      attributes: { profile_id: "abc-123" },
    })

    expect(result.success).toBe(true)

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://listmonk.test/api/subscribers/lists",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Authorization: "Basic dGVzdHVzZXI6dGVzdHBhc3M=",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          ids: [789],
          action: "add",
          target_list_ids: [4],
          status: "confirmed",
        }),
      })
    )
  })
})

describe("removeSubscriber", () => {
  let fetchSpy: MockInstance
  let consoleSpy: MockInstance

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch")
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    consoleSpy.mockRestore()
    vi.clearAllMocks()
  })

  it("should query for subscriber by email first", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            results: [
              {
                id: 456,
                email: "unsubscribe@example.com",
                lists: [{ id: 1 }, { id: 4 }],
              },
            ],
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

    const result = await removeSubscriber("unsubscribe@example.com")

    expect(result.success).toBe(true)

    const expectedEncodedQuery = encodeURIComponent(
      "subscribers.email ILIKE 'unsubscribe@example.com'"
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      `https://listmonk.test/api/subscribers?query=${expectedEncodedQuery}`,
      expect.objectContaining({
        method: "GET",
      })
    )
  })

  it("should remove subscriber from ALL lists using dedicated endpoint", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            results: [
              {
                id: 456,
                email: "unsubscribe@example.com",
                lists: [{ id: 1 }, { id: 4 }, { id: 7 }],
              },
            ],
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

    const result = await removeSubscriber("unsubscribe@example.com")

    expect(result.success).toBe(true)

    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      "https://listmonk.test/api/subscribers/lists",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Authorization: "Basic dGVzdHVzZXI6dGVzdHBhc3M=",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          ids: [456],
          action: "remove",
          target_list_ids: [1, 4, 7],
        }),
      })
    )
  })

  it("should handle subscriber not found gracefully", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          results: [],
        },
      }),
    } as Response)

    const result = await removeSubscriber("nonexistent@example.com")

    expect(result.success).toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it("should fail when query fails", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    } as Response)

    const result = await removeSubscriber("error@example.com")

    expect(result.success).toBe(false)
  })

  it("should fail when list removal fails", async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            results: [
              {
                id: 456,
                email: "unsubscribe@example.com",
                lists: [{ id: 1 }],
              },
            ],
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      } as Response)

    const result = await removeSubscriber("unsubscribe@example.com")

    expect(result.success).toBe(false)
  })
})

describe("createCampaign", () => {
  let fetchSpy: MockInstance
  let consoleSpy: MockInstance

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch")
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    consoleSpy.mockRestore()
    vi.clearAllMocks()
  })

  it("should create a campaign with correct data", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 456 } }),
    } as Response)

    const campaignData = {
      name: "Test Campaign",
      subject: "Test Subject",
      lists: [1, 2],
      body: "<p>Test content</p>",
    }

    const result = await createCampaign(campaignData)

    expect(result.success).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://listmonk.test/api/campaigns",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Basic dGVzdHVzZXI6dGVzdHBhc3M=",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(campaignData),
      })
    )
  })

  it("should succeed but log error when API returns error", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
    } as Response)

    const result = await createCampaign({ name: "Test", lists: [] })

    expect(result.success).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to create campaign")
    )
  })

  it("should fail when network error occurs", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"))

    const result = await createCampaign({ name: "Test", lists: [] })

    expect(result.success).toBe(false)
  })
})

describe("updateCampaignStatus", () => {
  let fetchSpy: MockInstance
  let consoleSpy: MockInstance

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch")
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    consoleSpy.mockRestore()
    vi.clearAllMocks()
  })

  it("should update campaign status", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 456, status: "running" } }),
    } as Response)

    const result = await updateCampaignStatus(456, "running")

    expect(result.success).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://listmonk.test/api/campaigns/456/status",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Authorization: "Basic dGVzdHVzZXI6dGVzdHBhc3M=",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ status: "running" }),
      })
    )
  })

  it("should succeed but log error when API returns error", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    } as Response)

    const result = await updateCampaignStatus(456, "paused")

    expect(result.success).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to update campaign status")
    )
  })

  it("should fail when network error occurs", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"))

    const result = await updateCampaignStatus(456, "cancelled")

    expect(result.success).toBe(false)
  })
})
