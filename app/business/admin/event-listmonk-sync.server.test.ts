import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

const mockKysely = {
  selectFrom: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  selectAll: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  whereRef: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  updateTable: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue([]),
  executeTakeFirst: vi.fn().mockResolvedValue(undefined),
  executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
    id: "event-123",
    title: "Test Event",
    listmonk_list_id: null,
    listmonk_list_synced_at: null,
  }),
}

vi.mock("~/kysely", () => ({
  kysely: mockKysely,
}))

const mockCreateList = vi.fn()
const mockDeleteList = vi.fn()
const mockGetListById = vi.fn()

vi.mock("../newsletter/listmonk-lists.server", () => ({
  createList: mockCreateList,
  deleteList: mockDeleteList,
  getListById: mockGetListById,
}))

const mockAddSubscriber = vi.fn()

vi.mock("../newsletter/listmonk-client.server", () => ({
  addSubscriber: mockAddSubscriber,
}))

import {
  createEventListmonkList,
  deleteEventListmonkList,
  updateEventListmonkList,
  getEventListStaleness,
} from "./event-listmonk-sync.server"

describe("createEventListmonkList", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKysely.executeTakeFirstOrThrow.mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      listmonk_list_id: null,
      listmonk_list_synced_at: null,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("should create a list with name 'Inscrites - [event title]'", async () => {
    mockCreateList.mockResolvedValue({
      success: true,
      data: { id: 456, name: "Inscrites - Test Event" },
    })
    mockKysely.execute.mockResolvedValue([])

    const result = await createEventListmonkList("event-123")

    expect(result.success).toBe(true)
    expect(mockCreateList).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Inscrites - Test Event",
        type: "private",
        optin: "single",
      })
    )
  })

  it("should add non-rejected participants to the list", async () => {
    mockCreateList.mockResolvedValue({
      success: true,
      data: { id: 456, name: "Inscrites - Test Event" },
    })
    mockKysely.execute.mockResolvedValue([
      {
        profile_id: "profile-1",
        email: "user1@example.com",
        social_name: "User One",
        full_name: "User One Full",
        approved_to_attend: "approved",
      },
      {
        profile_id: "profile-2",
        email: "user2@example.com",
        social_name: "User Two",
        full_name: "User Two Full",
        approved_to_attend: "pending",
      },
    ])
    mockAddSubscriber.mockResolvedValue({ success: true })

    const result = await createEventListmonkList("event-123")

    expect(result.success).toBe(true)
    expect(result.data?.subscribersAdded).toBe(2)
    expect(mockAddSubscriber).toHaveBeenCalledTimes(2)
  })

  it("should exclude rejected participants", async () => {
    mockCreateList.mockResolvedValue({
      success: true,
      data: { id: 456, name: "Inscrites - Test Event" },
    })
    mockKysely.execute.mockResolvedValue([
      {
        profile_id: "profile-1",
        email: "user1@example.com",
        social_name: "User One",
        full_name: "User One Full",
        approved_to_attend: "approved",
      },
      {
        profile_id: "profile-2",
        email: "rejected@example.com",
        social_name: "Rejected User",
        full_name: "Rejected User Full",
        approved_to_attend: "rejected",
      },
    ])
    mockAddSubscriber.mockResolvedValue({ success: true })

    const result = await createEventListmonkList("event-123")

    expect(result.success).toBe(true)
    expect(result.data?.subscribersAdded).toBe(1)
    expect(mockAddSubscriber).toHaveBeenCalledTimes(1)
    expect(mockAddSubscriber).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "user1@example.com",
      })
    )
  })

  it("should update event with listmonk_list_id and listmonk_list_synced_at", async () => {
    mockCreateList.mockResolvedValue({
      success: true,
      data: { id: 789, name: "Inscrites - Test Event" },
    })
    mockKysely.execute.mockResolvedValue([])

    await createEventListmonkList("event-123")

    expect(mockKysely.updateTable).toHaveBeenCalledWith("events")
    expect(mockKysely.set).toHaveBeenCalledWith(
      expect.objectContaining({
        listmonk_list_id: 789,
      })
    )
  })

  it("should fail gracefully when list creation fails", async () => {
    mockCreateList.mockResolvedValue({
      success: false,
      errors: [{ message: "API Error" }],
    })

    const result = await createEventListmonkList("event-123")

    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()
  })

  it("should handle partial subscriber failures", async () => {
    mockCreateList.mockResolvedValue({
      success: true,
      data: { id: 456, name: "Inscrites - Test Event" },
    })
    mockKysely.execute.mockResolvedValue([
      {
        profile_id: "profile-1",
        email: "user1@example.com",
        social_name: "User One",
        full_name: "User One Full",
        approved_to_attend: "approved",
      },
      {
        profile_id: "profile-2",
        email: "user2@example.com",
        social_name: "User Two",
        full_name: "User Two Full",
        approved_to_attend: "approved",
      },
    ])
    mockAddSubscriber
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, errors: [{ message: "Failed" }] })

    const result = await createEventListmonkList("event-123")

    expect(result.success).toBe(true)
    expect(result.data?.subscribersAdded).toBe(1)
    expect(result.data?.subscribersFailed).toBe(1)
  })
})

describe("deleteEventListmonkList", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("should delete the list when listmonk_list_id exists", async () => {
    mockKysely.executeTakeFirstOrThrow.mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      listmonk_list_id: 456,
      listmonk_list_synced_at: "2024-01-01T00:00:00Z",
    })
    mockDeleteList.mockResolvedValue({ success: true })

    const result = await deleteEventListmonkList("event-123")

    expect(result.success).toBe(true)
    expect(mockDeleteList).toHaveBeenCalledWith(456)
  })

  it("should clear listmonk_list_id and listmonk_list_synced_at from event", async () => {
    mockKysely.executeTakeFirstOrThrow.mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      listmonk_list_id: 456,
      listmonk_list_synced_at: "2024-01-01T00:00:00Z",
    })
    mockDeleteList.mockResolvedValue({ success: true })

    await deleteEventListmonkList("event-123")

    expect(mockKysely.updateTable).toHaveBeenCalledWith("events")
    expect(mockKysely.set).toHaveBeenCalledWith(
      expect.objectContaining({
        listmonk_list_id: null,
        listmonk_list_synced_at: null,
      })
    )
  })

  it("should succeed when event has no list", async () => {
    mockKysely.executeTakeFirstOrThrow.mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      listmonk_list_id: null,
      listmonk_list_synced_at: null,
    })

    const result = await deleteEventListmonkList("event-123")

    expect(result.success).toBe(true)
    expect(mockDeleteList).not.toHaveBeenCalled()
  })

  it("should succeed even when list deletion fails with 404", async () => {
    mockKysely.executeTakeFirstOrThrow.mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      listmonk_list_id: 456,
      listmonk_list_synced_at: "2024-01-01T00:00:00Z",
    })
    mockDeleteList.mockResolvedValue({ success: true })

    const result = await deleteEventListmonkList("event-123")

    expect(result.success).toBe(true)
  })
})

describe("updateEventListmonkList", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("should create a new list if none exists", async () => {
    mockKysely.executeTakeFirstOrThrow.mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      listmonk_list_id: null,
      listmonk_list_synced_at: null,
    })
    mockCreateList.mockResolvedValue({
      success: true,
      data: { id: 456, name: "Inscrites - Test Event" },
    })
    mockKysely.execute.mockResolvedValue([])

    const result = await updateEventListmonkList("event-123")

    expect(result.success).toBe(true)
    expect(mockCreateList).toHaveBeenCalled()
  })

  it("should update existing list by re-syncing subscribers", async () => {
    mockKysely.executeTakeFirstOrThrow.mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      listmonk_list_id: 456,
      listmonk_list_synced_at: "2024-01-01T00:00:00Z",
    })
    mockGetListById.mockResolvedValue({
      success: true,
      data: { id: 456, name: "Inscrites - Test Event" },
    })
    mockKysely.execute.mockResolvedValue([
      {
        profile_id: "profile-1",
        email: "user1@example.com",
        social_name: "User One",
        full_name: "User One Full",
        approved_to_attend: "approved",
      },
    ])
    mockAddSubscriber.mockResolvedValue({ success: true })

    const result = await updateEventListmonkList("event-123")

    expect(result.success).toBe(true)
    expect(mockCreateList).not.toHaveBeenCalled()
    expect(mockAddSubscriber).toHaveBeenCalled()
  })

  it("should update listmonk_list_synced_at timestamp", async () => {
    mockKysely.executeTakeFirstOrThrow.mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      listmonk_list_id: 456,
      listmonk_list_synced_at: "2024-01-01T00:00:00Z",
    })
    mockGetListById.mockResolvedValue({
      success: true,
      data: { id: 456, name: "Inscrites - Test Event" },
    })
    mockKysely.execute.mockResolvedValue([])

    await updateEventListmonkList("event-123")

    expect(mockKysely.updateTable).toHaveBeenCalledWith("events")
    expect(mockKysely.set).toHaveBeenCalledWith(
      expect.objectContaining({
        listmonk_list_synced_at: expect.any(Date),
      })
    )
  })
})

describe("getEventListStaleness", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("should return not stale when no participants were updated after sync", async () => {
    const syncTime = new Date("2024-01-15T00:00:00Z")
    mockKysely.executeTakeFirstOrThrow.mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      listmonk_list_id: 456,
      listmonk_list_synced_at: syncTime.toISOString(),
    })
    mockKysely.executeTakeFirst.mockResolvedValue({
      max_updated_at: new Date("2024-01-10T00:00:00Z"),
      count: 0,
    })

    const result = await getEventListStaleness("event-123")

    expect(result.success).toBe(true)
    expect(result.data?.isStale).toBe(false)
    expect(result.data?.staleParticipantCount).toBe(0)
  })

  it("should return stale when participants were updated after sync", async () => {
    const syncTime = new Date("2024-01-15T00:00:00Z")
    mockKysely.executeTakeFirstOrThrow.mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      listmonk_list_id: 456,
      listmonk_list_synced_at: syncTime.toISOString(),
    })
    mockKysely.executeTakeFirst.mockResolvedValue({
      max_updated_at: new Date("2024-01-20T00:00:00Z"),
      count: 3,
    })

    const result = await getEventListStaleness("event-123")

    expect(result.success).toBe(true)
    expect(result.data?.isStale).toBe(true)
    expect(result.data?.staleParticipantCount).toBe(3)
  })

  it("should return not stale when list has never been synced", async () => {
    mockKysely.executeTakeFirstOrThrow.mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      listmonk_list_id: null,
      listmonk_list_synced_at: null,
    })

    const result = await getEventListStaleness("event-123")

    expect(result.success).toBe(true)
    expect(result.data?.isStale).toBe(false)
  })

  it("should return not stale when there are no participants", async () => {
    const syncTime = new Date("2024-01-15T00:00:00Z")
    mockKysely.executeTakeFirstOrThrow.mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      listmonk_list_id: 456,
      listmonk_list_synced_at: syncTime.toISOString(),
    })
    mockKysely.executeTakeFirst.mockResolvedValue({
      max_updated_at: null,
      count: 0,
    })

    const result = await getEventListStaleness("event-123")

    expect(result.success).toBe(true)
    expect(result.data?.isStale).toBe(false)
  })
})
