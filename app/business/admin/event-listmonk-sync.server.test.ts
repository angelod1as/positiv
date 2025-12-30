import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import type { ListmonkList } from "../newsletter/listmonk-lists.server"

const {
  mockSqlExecute,
  mockExecute,
  mockExecuteTakeFirst,
  mockExecuteTakeFirstOrThrow,
  mockWhere,
} = vi.hoisted(() => ({
  mockSqlExecute: vi.fn().mockResolvedValue({ rows: [] }),
  mockExecute: vi.fn().mockResolvedValue([]),
  mockExecuteTakeFirst: vi.fn().mockResolvedValue(undefined),
  mockExecuteTakeFirstOrThrow: vi.fn().mockResolvedValue({
    id: "event-123",
    title: "Test Event",
    listmonk_list_id: null,
    listmonk_list_synced_at: null,
  }),
  mockWhere: vi.fn(),
}))

vi.mock("kysely", async () => {
  const actual = await vi.importActual("kysely")
  return {
    ...actual,
    sql: Object.assign(
      () => ({
        as: () => ({}),
        execute: mockSqlExecute,
      }),
      {
        raw: () => ({}),
      }
    ),
  }
})

vi.mock("~/kysely", () => {
  const chain = {
    selectFrom: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    selectAll: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: mockWhere.mockReturnThis(),
    whereRef: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    updateTable: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    execute: mockExecute,
    executeTakeFirst: mockExecuteTakeFirst,
    executeTakeFirstOrThrow: mockExecuteTakeFirstOrThrow,
  }
  return { kysely: chain }
})

vi.mock("../newsletter/listmonk-lists.server", () => ({
  createList: vi.fn(),
  deleteList: vi.fn(),
  getListById: vi.fn(),
}))

vi.mock("../newsletter/listmonk-client.server", () => ({
  addSubscriber: vi.fn(),
}))

import {
  createEventListmonkList,
  deleteEventListmonkList,
  updateEventListmonkList,
  getEventListStaleness,
} from "./event-listmonk-sync.server"
import { createList, deleteList, getListById } from "../newsletter/listmonk-lists.server"
import { addSubscriber } from "../newsletter/listmonk-client.server"

const mockCreateList = vi.mocked(createList)
const mockDeleteList = vi.mocked(deleteList)
const mockGetListById = vi.mocked(getListById)
const mockAddSubscriber = vi.mocked(addSubscriber)

function createMockListmonkList(overrides: Partial<ListmonkList> = {}): ListmonkList {
  return {
    id: 456,
    uuid: "test-uuid",
    name: "Inscrites - Test Event",
    type: "private",
    optin: "single",
    tags: [],
    subscriber_count: 0,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    ...overrides,
  }
}

describe("createEventListmonkList", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExecuteTakeFirstOrThrow.mockResolvedValue({
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
      data: createMockListmonkList(),
      errors: [],
    })
    mockExecute.mockResolvedValue([])

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
      data: createMockListmonkList(),
      errors: [],
    })
    mockExecute.mockResolvedValue([
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
    mockAddSubscriber.mockResolvedValue({ success: true, data: undefined, errors: [] })

    const result = await createEventListmonkList("event-123")

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.subscribersAdded).toBe(2)
    }
    expect(mockAddSubscriber).toHaveBeenCalledTimes(2)
  })

  it("should query for non-rejected participants only", async () => {
    mockCreateList.mockResolvedValue({
      success: true,
      data: createMockListmonkList(),
      errors: [],
    })
    mockExecute.mockResolvedValue([
      {
        profile_id: "profile-1",
        email: "user1@example.com",
        social_name: "User One",
        full_name: "User One Full",
        approved_to_attend: "approved",
      },
    ])
    mockAddSubscriber.mockResolvedValue({ success: true, data: undefined, errors: [] })

    const result = await createEventListmonkList("event-123")

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.subscribersAdded).toBe(1)
    }
    expect(mockWhere).toHaveBeenCalledWith("p.approved_to_attend", "!=", "rejected")
    expect(mockAddSubscriber).toHaveBeenCalledTimes(1)
    expect(mockAddSubscriber).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "user1@example.com",
      })
    )
  })

  it("should update event with listmonk_list_id via Kysely updateTable", async () => {
    mockCreateList.mockResolvedValue({
      success: true,
      data: createMockListmonkList({ id: 789 }),
      errors: [],
    })
    mockExecute.mockResolvedValue([])

    await createEventListmonkList("event-123")

    expect(mockExecute).toHaveBeenCalled()
  })

  it("should fail gracefully when list creation fails", async () => {
    mockCreateList.mockResolvedValue({
      success: false,
      errors: [{ name: "Error", message: "API Error" }],
    } as Awaited<ReturnType<typeof createList>>)

    const result = await createEventListmonkList("event-123")

    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()
  })

  it("should handle partial subscriber failures", async () => {
    mockCreateList.mockResolvedValue({
      success: true,
      data: createMockListmonkList(),
      errors: [],
    })
    mockExecute.mockResolvedValue([
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
      .mockResolvedValueOnce({ success: true, data: undefined, errors: [] })
      .mockResolvedValueOnce({ success: false, errors: [{ name: "Error", message: "Failed" }] } as Awaited<ReturnType<typeof addSubscriber>>)

    const result = await createEventListmonkList("event-123")

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.subscribersAdded).toBe(1)
      expect(result.data.subscribersFailed).toBe(1)
    }
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
    mockExecuteTakeFirstOrThrow.mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      listmonk_list_id: 456,
      listmonk_list_synced_at: "2024-01-01T00:00:00Z",
    })
    mockDeleteList.mockResolvedValue({ success: true, data: undefined, errors: [] })
    mockExecute.mockResolvedValue([])

    const result = await deleteEventListmonkList("event-123")

    expect(result.success).toBe(true)
    expect(mockDeleteList).toHaveBeenCalledWith(456)
  })

  it("should clear listmonk fields via Kysely updateTable", async () => {
    mockExecuteTakeFirstOrThrow.mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      listmonk_list_id: 456,
      listmonk_list_synced_at: "2024-01-01T00:00:00Z",
    })
    mockDeleteList.mockResolvedValue({ success: true, data: undefined, errors: [] })
    mockExecute.mockResolvedValue([])

    await deleteEventListmonkList("event-123")

    expect(mockExecute).toHaveBeenCalled()
  })

  it("should succeed when event has no list", async () => {
    mockExecuteTakeFirstOrThrow.mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      listmonk_list_id: null,
      listmonk_list_synced_at: null,
    })
    mockExecute.mockResolvedValue([])

    const result = await deleteEventListmonkList("event-123")

    expect(result.success).toBe(true)
    expect(mockDeleteList).not.toHaveBeenCalled()
  })

  it("should succeed even when list deletion fails with 404", async () => {
    mockExecuteTakeFirstOrThrow.mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      listmonk_list_id: 456,
      listmonk_list_synced_at: "2024-01-01T00:00:00Z",
    })
    mockDeleteList.mockResolvedValue({ success: true, data: undefined, errors: [] })
    mockExecute.mockResolvedValue([])

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
    mockExecuteTakeFirstOrThrow.mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      listmonk_list_id: null,
      listmonk_list_synced_at: null,
    })
    mockCreateList.mockResolvedValue({
      success: true,
      data: createMockListmonkList(),
      errors: [],
    })
    mockExecute.mockResolvedValue([])

    const result = await updateEventListmonkList("event-123")

    expect(result.success).toBe(true)
    expect(mockCreateList).toHaveBeenCalled()
  })

  it("should update existing list by re-syncing subscribers", async () => {
    mockExecuteTakeFirstOrThrow.mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      listmonk_list_id: 456,
      listmonk_list_synced_at: "2024-01-01T00:00:00Z",
    })
    mockGetListById.mockResolvedValue({
      success: true,
      data: createMockListmonkList(),
      errors: [],
    })
    mockExecute.mockResolvedValue([
      {
        profile_id: "profile-1",
        email: "user1@example.com",
        social_name: "User One",
        full_name: "User One Full",
        approved_to_attend: "approved",
      },
    ])
    mockAddSubscriber.mockResolvedValue({ success: true, data: undefined, errors: [] })

    const result = await updateEventListmonkList("event-123")

    expect(result.success).toBe(true)
    expect(mockCreateList).not.toHaveBeenCalled()
    expect(mockAddSubscriber).toHaveBeenCalled()
  })

  it("should update listmonk_list_synced_at timestamp via Kysely updateTable", async () => {
    mockExecuteTakeFirstOrThrow.mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      listmonk_list_id: 456,
      listmonk_list_synced_at: "2024-01-01T00:00:00Z",
    })
    mockGetListById.mockResolvedValue({
      success: true,
      data: createMockListmonkList(),
      errors: [],
    })
    mockExecute.mockResolvedValue([])

    await updateEventListmonkList("event-123")

    expect(mockExecute).toHaveBeenCalled()
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
    mockExecuteTakeFirstOrThrow.mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      listmonk_list_id: 456,
      listmonk_list_synced_at: syncTime.toISOString(),
    })
    mockExecuteTakeFirst.mockResolvedValue({
      max_updated_at: new Date("2024-01-10T00:00:00Z"),
      count: 0,
    })

    const result = await getEventListStaleness("event-123")

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.isStale).toBe(false)
      expect(result.data.staleParticipantCount).toBe(0)
    }
  })

  it("should return stale when participants were updated after sync", async () => {
    const syncTime = new Date("2024-01-15T00:00:00Z")
    mockExecuteTakeFirstOrThrow.mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      listmonk_list_id: 456,
      listmonk_list_synced_at: syncTime.toISOString(),
    })
    mockExecuteTakeFirst.mockResolvedValue({
      max_updated_at: new Date("2024-01-20T00:00:00Z"),
      count: 3,
    })

    const result = await getEventListStaleness("event-123")

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.isStale).toBe(true)
      expect(result.data.staleParticipantCount).toBe(3)
    }
  })

  it("should return not stale when list has never been synced", async () => {
    mockExecuteTakeFirstOrThrow.mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      listmonk_list_id: null,
      listmonk_list_synced_at: null,
    })

    const result = await getEventListStaleness("event-123")

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.isStale).toBe(false)
    }
  })

  it("should return not stale when there are no participants", async () => {
    const syncTime = new Date("2024-01-15T00:00:00Z")
    mockExecuteTakeFirstOrThrow.mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      listmonk_list_id: 456,
      listmonk_list_synced_at: syncTime.toISOString(),
    })
    mockExecuteTakeFirst.mockResolvedValue({
      max_updated_at: null,
      count: 0,
    })

    const result = await getEventListStaleness("event-123")

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.isStale).toBe(false)
    }
  })
})
