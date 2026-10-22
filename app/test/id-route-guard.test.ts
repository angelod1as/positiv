import { beforeEach, describe, expect, it, vi } from "vitest"
import { getAdminContext } from "~/business/admin/admin.server"
import { getContext, getUserContext } from "~/business/auth/auth.server"
import { loader as downloadCalendarLoader } from "~/pages/dashboard/download-calendar.route"
import { action as submitApplicationAction } from "~/pages/api/events/submit-application"
import { action as verifyRulesQuizAction } from "~/pages/api/events/verify-rules-quiz"
import { loader as applicationConfirmationLoader } from "~/pages/events/application/confirmation/event-application-confirmation-page"
import { loader as eventRulesLoader } from "~/pages/events/application/rules/event-rules-page"
import { loader as eventUserDataLoader } from "~/pages/events/application/user-data/event-user-data"
import { loader as eventLoader } from "~/pages/events/event"
import {
  action as paymentAction,
  loader as paymentLoader,
} from "~/pages/payment/payment-page"
import { loader as paymentThanksLoader } from "~/pages/payment/payment-thanks-page"

const { dbAccess } = vi.hoisted(() => ({ dbAccess: vi.fn() }))

// Any property read on the client -- selectFrom, transaction, anything -- is a
// query about to happen. Every read and call answers the same proxy, so a
// module that builds a base query when it loads still loads; the reads it made
// are cleared before each test.
vi.mock("~/kysely-db", () => {
  const chain: object = new Proxy(() => undefined, {
    get: (_target, property) => {
      if (property === "then") return undefined
      dbAccess(property)
      return chain
    },
    apply: () => chain,
  })
  return { kyselyDb: chain }
})

vi.mock("~/business/auth/auth.server", () => ({
  getContext: vi.fn(),
  getUserContext: vi.fn(),
}))

vi.mock("~/business/admin/admin.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/business/admin/admin.server")>()),
  getAdminContext: vi.fn(),
}))

type Handler = (args: never) => unknown

const NOT_A_UUID = "eventos"
const UUID = "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c"

const cases: { route: string; handler: Handler; params: object }[] = [
  {
    route: "loader /dashboard/:id",
    handler: eventLoader,
    params: { id: NOT_A_UUID },
  },
  {
    route: "loader /dashboard/:id/regras",
    handler: eventRulesLoader,
    params: { id: NOT_A_UUID },
  },
  {
    route: "loader /dashboard/:id/dados",
    handler: eventUserDataLoader,
    params: { id: NOT_A_UUID },
  },
  {
    route: "loader /dashboard/:id/candidatura-enviada",
    handler: applicationConfirmationLoader,
    params: { id: NOT_A_UUID },
  },
  {
    route: "loader /dashboard/download-calendar/:eventId",
    handler: downloadCalendarLoader,
    params: { eventId: NOT_A_UUID },
  },
  {
    route: "action /api/events/:id/rules-quiz",
    handler: verifyRulesQuizAction,
    params: { id: NOT_A_UUID },
  },
  {
    route: "action /api/events/:id/application",
    handler: submitApplicationAction,
    params: { id: NOT_A_UUID },
  },
  {
    route: "loader /pagamento/:paymentId",
    handler: paymentLoader,
    params: { paymentId: NOT_A_UUID },
  },
  {
    route: "action /pagamento/:paymentId",
    handler: paymentAction,
    params: { paymentId: NOT_A_UUID },
  },
  {
    route: "loader /pagamento/:paymentId/obrigado",
    handler: paymentThanksLoader,
    params: { paymentId: NOT_A_UUID },
  },
]

async function rejection(handler: Handler, params: object) {
  const args = {
    request: new Request(`http://localhost/${NOT_A_UUID}`, { method: "POST" }),
    params,
    context: {},
  }

  try {
    await handler(args as never)
  } catch (error) {
    return error
  }
  return undefined
}

describe("id routes reached with a param that is not a uuid", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each(cases)(
    "$route answers 404 before any query",
    async ({ handler, params }) => {
      const error = await rejection(handler, params)

      expect(error).toBeInstanceOf(Response)
      expect((error as Response).status).toBe(404)
      expect(dbAccess).not.toHaveBeenCalled()
      expect(getContext).not.toHaveBeenCalled()
      expect(getUserContext).not.toHaveBeenCalled()
      expect(getAdminContext).not.toHaveBeenCalled()
    },
  )

  it("lets a uuid through to the route", async () => {
    vi.mocked(getUserContext).mockResolvedValue({
      currentProfile: null,
    } as Awaited<ReturnType<typeof getUserContext>>)

    await rejection(eventLoader, { id: UUID })

    expect(getUserContext).toHaveBeenCalled()
  })
})
