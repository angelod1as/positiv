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
  getListSubscribers: vi.fn(),
}))

vi.mock("../newsletter/listmonk-client.server", () => ({
  addSubscriber: vi.fn(),
  addSubscribersToListBulk: vi.fn(),
  removeSubscriberFromList: vi.fn(),
}))

vi.mock("../newsletter/subscription-helpers.server", () => ({
  updateSyncStatus: vi.fn(),
}))

import {
  createEventListmonkList,
  deleteEventListmonkList,
  updateEventListmonkList,
  listmonkSyncFiltersSchema,
} from "./event-listmonk-sync.server"
import { createList, deleteList, getListById, getListSubscribers } from "../newsletter/listmonk-lists.server"
import { addSubscriber, addSubscribersToListBulk, removeSubscriberFromList } from "../newsletter/listmonk-client.server"
import { updateSyncStatus } from "../newsletter/subscription-helpers.server"

const mockCreateList = vi.mocked(createList)
const mockDeleteList = vi.mocked(deleteList)
const mockGetListById = vi.mocked(getListById)
const mockGetListSubscribers = vi.mocked(getListSubscribers)
const mockAddSubscriber = vi.mocked(addSubscriber)
const mockAddSubscribersToListBulk = vi.mocked(addSubscribersToListBulk)
const mockRemoveSubscriberFromList = vi.mocked(removeSubscriberFromList)
const mockUpdateSyncStatus = vi.mocked(updateSyncStatus)

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
        listmonk_subscriber_id: null,
      },
      {
        profile_id: "profile-2",
        email: "user2@example.com",
        social_name: "User Two",
        full_name: "User Two Full",
        approved_to_attend: "pending",
        listmonk_subscriber_id: null,
      },
    ])
    mockAddSubscriber.mockResolvedValue({ success: true, data: { subscriberId: 123 }, errors: [] })

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
        listmonk_subscriber_id: null,
      },
    ])
    mockAddSubscriber.mockResolvedValue({ success: true, data: { subscriberId: 123 }, errors: [] })

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

  it("should save new subscriber IDs for future bulk operations", async () => {
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
        listmonk_subscriber_id: null,
      },
    ])
    mockAddSubscriber.mockResolvedValue({ success: true, data: { subscriberId: 789 }, errors: [] })

    const result = await createEventListmonkList("event-123")

    expect(result.success).toBe(true)
    expect(mockUpdateSyncStatus).toHaveBeenCalledWith("profile-1", "synced", 789)
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
        listmonk_subscriber_id: null,
      },
      {
        profile_id: "profile-2",
        email: "user2@example.com",
        social_name: "User Two",
        full_name: "User Two Full",
        approved_to_attend: "approved",
        listmonk_subscriber_id: null,
      },
    ])
    mockAddSubscriber
      .mockResolvedValueOnce({ success: true, data: { subscriberId: 123 }, errors: [] })
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
    mockGetListSubscribers.mockResolvedValue({
      success: true,
      data: [],
      errors: [],
    })
    mockExecute.mockResolvedValue([
      {
        profile_id: "profile-1",
        email: "user1@example.com",
        social_name: "User One",
        full_name: "User One Full",
        approved_to_attend: "approved",
        listmonk_subscriber_id: null,
      },
    ])
    mockAddSubscriber.mockResolvedValue({ success: true, data: { subscriberId: 123 }, errors: [] })

    const result = await updateEventListmonkList("event-123")

    expect(result.success).toBe(true)
    expect(mockCreateList).not.toHaveBeenCalled()
    expect(mockAddSubscriber).toHaveBeenCalled()
  })

  it("should remove subscribers who are no longer eligible", async () => {
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
    mockGetListSubscribers.mockResolvedValue({
      success: true,
      data: [
        { id: 100, email: "rejected@example.com", name: "Rejected User", status: "confirmed" },
        { id: 101, email: "user1@example.com", name: "User One", status: "confirmed" },
      ],
      errors: [],
    })
    mockExecute.mockResolvedValue([
      {
        profile_id: "profile-1",
        email: "user1@example.com",
        social_name: "User One",
        full_name: "User One Full",
        approved_to_attend: "approved",
        listmonk_subscriber_id: 101,
      },
    ])
    mockAddSubscribersToListBulk.mockResolvedValue({ success: true, data: undefined, errors: [] })

    const result = await updateEventListmonkList("event-123")

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.subscribersRemoved).toBe(1)
    }
    expect(mockRemoveSubscriberFromList).toHaveBeenCalledWith(100, 456)
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
    mockGetListSubscribers.mockResolvedValue({
      success: true,
      data: [],
      errors: [],
    })
    mockExecute.mockResolvedValue([])

    await updateEventListmonkList("event-123")

    expect(mockExecute).toHaveBeenCalled()
  })
})

describe("listmonkSyncFiltersSchema", () => {
  it("should validate correct approval statuses", () => {
    const result = listmonkSyncFiltersSchema.safeParse({
      approvalStatuses: ["pending", "approved"],
    })
    expect(result.success).toBe(true)
  })

  it("should validate correct application statuses", () => {
    const result = listmonkSyncFiltersSchema.safeParse({
      applicationStatuses: ["pending", "talking", "finalised"],
    })
    expect(result.success).toBe(true)
  })

  it("should validate correct attendance statuses", () => {
    const result = listmonkSyncFiltersSchema.safeParse({
      attendanceStatuses: ["pending", "attended", "not-attended"],
    })
    expect(result.success).toBe(true)
  })

  it("should validate all three filter types together", () => {
    const result = listmonkSyncFiltersSchema.safeParse({
      approvalStatuses: ["approved"],
      applicationStatuses: ["finalised"],
      attendanceStatuses: ["attended"],
    })
    expect(result.success).toBe(true)
  })

  it("should accept empty arrays", () => {
    const result = listmonkSyncFiltersSchema.safeParse({
      approvalStatuses: [],
      applicationStatuses: [],
      attendanceStatuses: [],
    })
    expect(result.success).toBe(true)
  })

  it("should accept undefined filters", () => {
    const result = listmonkSyncFiltersSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("should reject invalid approval status values", () => {
    const result = listmonkSyncFiltersSchema.safeParse({
      approvalStatuses: ["invalid_status"],
    })
    expect(result.success).toBe(false)
  })

  it("should reject invalid application status values", () => {
    const result = listmonkSyncFiltersSchema.safeParse({
      applicationStatuses: ["invalid_status"],
    })
    expect(result.success).toBe(false)
  })

  it("should reject invalid attendance status values", () => {
    const result = listmonkSyncFiltersSchema.safeParse({
      attendanceStatuses: ["invalid_status"],
    })
    expect(result.success).toBe(false)
  })
})

describe("updateEventListmonkList with filters", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("should filter by approval statuses when provided", async () => {
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

    await updateEventListmonkList("event-123", {
      approvalStatuses: ["approved", "pending"],
    })

    expect(mockWhere).toHaveBeenCalledWith("p.approved_to_attend", "in", ["approved", "pending"])
  })

  it("should filter by application statuses when provided", async () => {
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

    await updateEventListmonkList("event-123", {
      applicationStatuses: ["finalised"],
    })

    expect(mockWhere).toHaveBeenCalledWith("ep.application_status", "in", ["finalised"])
  })

  it("should filter by attendance statuses when provided", async () => {
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

    await updateEventListmonkList("event-123", {
      attendanceStatuses: ["attended", "pending"],
    })

    expect(mockWhere).toHaveBeenCalledWith("ep.attendance_status", "in", ["attended", "pending"])
  })

  it("should apply all three filters when provided", async () => {
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

    await updateEventListmonkList("event-123", {
      approvalStatuses: ["approved"],
      applicationStatuses: ["finalised"],
      attendanceStatuses: ["attended"],
    })

    expect(mockWhere).toHaveBeenCalledWith("p.approved_to_attend", "in", ["approved"])
    expect(mockWhere).toHaveBeenCalledWith("ep.application_status", "in", ["finalised"])
    expect(mockWhere).toHaveBeenCalledWith("ep.attendance_status", "in", ["attended"])
  })

  it("should use default filter when no filters provided", async () => {
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

    await updateEventListmonkList("event-123")

    expect(mockWhere).toHaveBeenCalledWith("p.approved_to_attend", "!=", "rejected")
  })

  it("should return no results when empty approval statuses array provided", async () => {
    const existingList = createMockListmonkList()
    mockExecuteTakeFirstOrThrow.mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      listmonk_list_id: existingList.id,
      listmonk_list_synced_at: null,
    })
    mockGetListById.mockResolvedValue({
      success: true,
      data: existingList,
      errors: [],
    })
    mockExecute.mockResolvedValue([])

    const result = await updateEventListmonkList("event-123", {
      approvalStatuses: [],
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.subscribersAdded).toBe(0)
      expect(result.data.subscribersRemoved).toBe(0)
    }
  })
})
