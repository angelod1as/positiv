import reactRouterConfig from "../../../react-router.config"
import type { SerializedError } from "./logger.server"
import { requestFacts } from "./request-facts.server"
import { appFrames } from "./stack-frames.server"

export interface FailureDescription {
  status: number
  summary: string
}

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])
const STATUS_CARRIERS = new Set(["Response", "ErrorResponse", "DataWithResponseInit"])
// react-router 7.18 throws these from throwIfPotentialCSRFAttack; the single
// fetch path swaps them for a bare "Bad Request" before handleError sees it.
const CSRF_MESSAGES = [
  "Bad Request",
  "The `request.url` origin does not match `origin` header from a forwarded action request. Aborting the action.",
  "`origin` header is not a valid URL. Aborting the action.",
]

function parseOrigin(origin: string): string | null {
  try {
    return new URL(origin).origin
  } catch {
    return null
  }
}

// The same comparison react-router makes before an action runs, redone from
// the request, because the error it hands over no longer says.
function csrfCause(
  error: SerializedError,
  request: Request,
  path: string,
): string | null {
  if (!MUTATION_METHODS.has(request.method)) return null
  if (!CSRF_MESSAGES.includes(error.message)) return null
  if (error.stack !== undefined && appFrames(error.stack).length > 0) return null
  const header = request.headers.get("origin")
  const { origin } = requestFacts(request, path)
  if (header === null || origin === undefined) return null
  const requestOrigin = new URL(request.url).origin
  const parsed = header === "null" ? "null" : parseOrigin(header)
  if (parsed === null) return `Origin ${origin} is not a valid URL`
  if (parsed === requestOrigin) return null
  if (
    parsed !== "null" &&
    reactRouterConfig.allowedActionOrigins.includes(new URL(parsed).host)
  ) {
    return null
  }
  return `Origin ${origin} does not match request URL ${requestOrigin}`
}

function statusOf(error: SerializedError): number {
  return STATUS_CARRIERS.has(error.name ?? "") && typeof error.status === "number"
    ? error.status
    : 500
}

// The first line of an alert: what the user did, what they got and the
// likeliest cause, before any JSON or stack.
export function describeFailure(
  error: SerializedError,
  request: Request,
  path: string,
): FailureDescription {
  const action = `${request.method} ${path}`
  const cause = csrfCause(error, request, path)
  if (cause !== null) {
    return {
      status: 400,
      summary: `${action} rejected with 400 before the action ran: ${cause} (react-router CSRF check)`,
    }
  }
  const status = statusOf(error)
  const what =
    error.name === undefined || error.message.startsWith(error.name)
      ? error.message
      : `${error.name}: ${error.message}`
  return { status, summary: `${action} failed with ${status}: ${what}` }
}
