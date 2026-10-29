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

vi.mock("~/kysely-db", () => {
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
  return { kyselyDb: chain }
})

vi.mock("../newsletter/listmonk-lists.server", () => ({
  createList: vi.fn(),
  deleteList: vi.fn(),
  getBlocklistedSubscribers: vi.fn(),
  getListById: vi.fn(),
  getListSubscribers: vi.fn(),
}))

vi.mock("../newsletter/listmonk-client.server", () => ({
  addSubscriber: vi.fn(),
  addSubscribersToListBulk: vi.fn(),
  removeSubscriberFromList: vi.fn(),
}))

vi.mock("../newsletter/subscription-helpers.server", () => ({
  saveListmonkSubscriberId: vi.fn(),
  updateSyncStatus: vi.fn(),
}))

import {
  createEventListmonkList,
  deleteEventListmonkList,
  updateEventListmonkList,
  listmonkSyncFiltersSchema,
} from "./event-listmonk-sync.server"
import {
  createList,
  deleteList,
  getBlocklistedSubscribers,
  getListById,
  getListSubscribers,
} from "../newsletter/listmonk-lists.server"
import { addSubscriber, addSubscribersToListBulk, removeSubscriberFromList } from "../newsletter/listmonk-client.server"
import {
  saveListmonkSubscriberId,
  updateSyncStatus,
} from "../newsletter/subscription-helpers.server"

const mockCreateList = vi.mocked(createList)
const mockDeleteList = vi.mocked(deleteList)
const mockGetListById = vi.mocked(getListById)
const mockGetListSubscribers = vi.mocked(getListSubscribers)
const mockGetBlocklistedSubscribers = vi.mocked(getBlocklistedSubscribers)
mockGetBlocklistedSubscribers.mockResolvedValue({ success: true, data: [], errors: [] })
const mockAddSubscriber = vi.mocked(addSubscriber)
const mockAddSubscribersToListBulk = vi.mocked(addSubscribersToListBulk)
const mockRemoveSubscriberFromList = vi.mocked(removeSubscriberFromList)
const mockSaveListmonkSubscriberId = vi.mocked(saveListmonkSubscriberId)
const mockUpdateSyncStatus = vi.mocked(updateSyncStatus)

function createMockListmonkList(overrides: Partial<ListmonkList> = {}): ListmonkList {
  return {
    id: 456,
    uuid: "test-uuid",
    name: "Candidates - Test Event",
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

  it("should create a list with name 'Candidates - [event title]'", async () => {
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
        name: "Candidates - Test Event",
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

  it("should save new subscriber IDs without writing consent", async () => {
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
    expect(mockSaveListmonkSubscriberId).toHaveBeenCalledWith("profile-1", 789)
    expect(mockUpdateSyncStatus).not.toHaveBeenCalled()
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
    mockGetListSubscribers.mockImplementation(async (_listId, membership) => ({
      success: true,
      data:
        membership === "unsubscribed"
          ? []
          : [
              { id: 100, email: "rejected@example.com", name: "Rejected User", status: "confirmed", updated_at: "2024-01-01T00:00:00Z", lists: [] },
              { id: 101, email: "user1@example.com", name: "User One", status: "confirmed", updated_at: "2024-01-01T00:00:00Z", lists: [] },
            ],
      errors: [],
    }))
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

describe("event list sync respects Listmonk opt-outs", () => {
  const optedOut = (id: number, email: string) => ({
    id,
    email,
    name: email,
    status: "enabled",
    updated_at: "2026-10-01T12:00:00Z",
    lists: [],
  })

  const participant = (n: number, listmonkSubscriberId: number | null) => ({
    profile_id: `profile-${n}`,
    email: `user${n}@example.com`,
    social_name: `User ${n}`,
    full_name: `User ${n} Full`,
    approved_to_attend: "approved",
    listmonk_subscriber_id: listmonkSubscriberId,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetBlocklistedSubscribers.mockResolvedValue({ success: true, data: [], errors: [] })
    mockAddSubscriber.mockResolvedValue({ success: true, data: { subscriberId: 900 }, errors: [] })
    mockAddSubscribersToListBulk.mockResolvedValue({ success: true, data: undefined, errors: [] })
  })

  afterEach(() => {
    mockGetBlocklistedSubscribers.mockResolvedValue({ success: true, data: [], errors: [] })
  })

  function withNewList() {
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
  }

  function withExistingList(unsubscribed: ReturnType<typeof optedOut>[]) {
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
    mockGetListSubscribers.mockImplementation(async (_listId, membership) => ({
      success: true,
      data: membership === "unsubscribed" ? unsubscribed : [],
      errors: [],
    }))
  }

  it("never adds a blocklisted participant", async () => {
    withNewList()
    mockGetBlocklistedSubscribers.mockResolvedValue({
      success: true,
      data: [optedOut(10, "USER1@example.com"), optedOut(20, "user3@example.com")],
      errors: [],
    })
    mockExecute.mockResolvedValue([
      participant(1, null),
      participant(2, null),
      participant(3, 20),
      participant(4, 40),
    ])

    const result = await createEventListmonkList("event-123")

    expect(result.success).toBe(true)
    expect(mockAddSubscriber).toHaveBeenCalledTimes(1)
    expect(mockAddSubscriber).toHaveBeenCalledWith(
      expect.objectContaining({ email: "user2@example.com" }),
    )
    expect(mockAddSubscribersToListBulk).toHaveBeenCalledWith([40], 456)
  })

  it("never re-confirms someone who left this event's list", async () => {
    withExistingList([optedOut(10, "user1@example.com")])
    mockExecute.mockResolvedValue([participant(1, 10), participant(2, 20)])

    const result = await updateEventListmonkList("event-123")

    expect(result.success).toBe(true)
    expect(mockGetListSubscribers).toHaveBeenCalledWith(456, "unsubscribed")
    expect(mockAddSubscribersToListBulk).toHaveBeenCalledWith([20], 456)
    expect(mockAddSubscriber).not.toHaveBeenCalled()
  })

  it("adds nobody when the opt-outs cannot be read", async () => {
    withNewList()
    mockGetBlocklistedSubscribers.mockResolvedValue({
      success: false,
      errors: [new Error("Listmonk is down")],
    })
    mockExecute.mockResolvedValue([participant(1, null), participant(2, 20)])

    const result = await createEventListmonkList("event-123")

    expect(result.success).toBe(false)
    expect(mockAddSubscriber).not.toHaveBeenCalled()
    expect(mockAddSubscribersToListBulk).not.toHaveBeenCalled()
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

  it("should skip approval filter when empty array provided", async () => {
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

    await updateEventListmonkList("event-123", {
      approvalStatuses: [],
    })

    expect(mockWhere).not.toHaveBeenCalledWith("p.approved_to_attend", "in", [])
    expect(mockWhere).not.toHaveBeenCalledWith("p.approved_to_attend", "!=", "rejected")
  })

  it("should skip application filter when empty array provided", async () => {
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

    await updateEventListmonkList("event-123", {
      applicationStatuses: [],
    })

    expect(mockWhere).toHaveBeenCalledWith("p.approved_to_attend", "!=", "rejected")
    expect(mockWhere).not.toHaveBeenCalledWith("ep.application_status", "in", [])
  })

  it("should skip attendance filter when empty array provided", async () => {
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

    await updateEventListmonkList("event-123", {
      attendanceStatuses: [],
    })

    expect(mockWhere).toHaveBeenCalledWith("p.approved_to_attend", "!=", "rejected")
    expect(mockWhere).not.toHaveBeenCalledWith("ep.attendance_status", "in", [])
  })

  it("should apply non-empty filters and skip empty ones", async () => {
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

    await updateEventListmonkList("event-123", {
      approvalStatuses: ["approved"],
      applicationStatuses: [],
      attendanceStatuses: ["attended"],
    })

    expect(mockWhere).toHaveBeenCalledWith("p.approved_to_attend", "in", ["approved"])
    expect(mockWhere).not.toHaveBeenCalledWith("ep.application_status", "in", expect.anything())
    expect(mockWhere).toHaveBeenCalledWith("ep.attendance_status", "in", ["attended"])
  })

  it("should skip all filters when all arrays are empty", async () => {
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

    await updateEventListmonkList("event-123", {
      approvalStatuses: [],
      applicationStatuses: [],
      attendanceStatuses: [],
    })

    expect(mockWhere).not.toHaveBeenCalledWith("p.approved_to_attend", expect.anything(), expect.anything())
    expect(mockWhere).not.toHaveBeenCalledWith("ep.application_status", expect.anything(), expect.anything())
    expect(mockWhere).not.toHaveBeenCalledWith("ep.attendance_status", expect.anything(), expect.anything())
  })
})
