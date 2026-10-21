import { MASK, redact } from "./redact.server"

export interface RequestContext {
  area?: string
  request: {
    method: string
    path: string
    params: Record<string, string | undefined>
    userAgent?: string
  }
}

const SENSITIVE_PARAM = /token|secret|key|code|password|hash/i
// React Router's single fetch asks for /some/path.data on client navigations.
const DATA_SUFFIX = /\.data$/

function userAgentFamily(userAgent: string): string {
  if (/bot|crawler|spider/i.test(userAgent)) return "bot"
  if (userAgent.includes("Edg/")) return "Edge"
  if (userAgent.includes("Firefox/")) return "Firefox"
  if (/Chrome\/|CriOS\//.test(userAgent)) return "Chrome"
  if (userAgent.includes("Safari/")) return "Safari"
  return "other"
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

// What an alert may say about the request: never the query string, which can
// carry tokens, and never the value of a param whose name looks like a secret
// — the invite page's :token is in its path.
export function requestContext(
  request: Request,
  params: Record<string, string | undefined>,
): RequestContext {
  const masked: Record<string, string | undefined> = {}
  const secrets = new Set<string>()
  for (const [name, value] of Object.entries(params)) {
    const sensitive = SENSITIVE_PARAM.test(name) && value !== undefined
    if (sensitive) secrets.add(value)
    masked[name] = sensitive ? MASK : value
  }

  const segments = new URL(request.url).pathname
    .replace(DATA_SUFFIX, "")
    .split("/")
  const safeSegments = segments.map((segment) => {
    const decoded = decodeSegment(segment)
    if (secrets.has(segment) || secrets.has(decoded)) return MASK
    const redacted = redact(decoded)
    return redacted === decoded ? segment : redacted
  })
  const path = safeSegments.join("/")
  const area = safeSegments.find((segment) => segment.length > 0)
  const userAgent = request.headers.get("user-agent")

  return {
    ...(area !== undefined && { area }),
    request: {
      method: request.method,
      path,
      params: masked,
      ...(userAgent && { userAgent: userAgentFamily(userAgent) }),
    },
  }
}
