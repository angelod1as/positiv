import { PassThrough } from "node:stream"

import { createReadableStreamFromReadable } from "@react-router/node"
import { isbot } from "isbot"
import type { RenderToPipeableStreamOptions } from "react-dom/server"
import { renderToPipeableStream } from "react-dom/server"
import type {
  AppLoadContext,
  EntryContext,
  HandleErrorFunction,
} from "react-router"
import { isRouteErrorResponse, ServerRouter } from "react-router"
import { describeFailure } from "~/lib/logger/describe-failure.server"
import { logger, serializeError } from "~/lib/logger/logger.server"
import { requestContext } from "~/lib/logger/request-context.server"
import { requestFacts } from "~/lib/logger/request-facts.server"
import { appFrames } from "~/lib/logger/stack-frames.server"
import { applyDraftCacheControl } from "./business/cms/draft-mode.server"

// The react-router 7.18.4 framework default (npx react-router reveal), with two
// additions: applyDraftCacheControl on both the document response
// (handleRequest) and the client-navigation data responses
// (handleDataRequest), so a draft render is never cached and served to a
// visitor; and handleError, so unhandled server errors reach the logger (and
// Telegram) in plain language, skipping 4xx route responses. Re-reveal and
// re-diff when upgrading react-router.
export const streamTimeout = 5_000

export const handleError: HandleErrorFunction = (
  error,
  { request, params },
) => {
  if (request.signal.aborted) return
  if (isRouteErrorResponse(error) && error.status < 500) return
  const context = requestContext(request, params)
  const serialized = serializeError(error)
  const { status, summary, foreignOrigin } = describeFailure(
    serialized,
    request,
    context.request.path,
  )
  const fromApp =
    serialized.stack !== undefined && appFrames(serialized.stack).length > 0
  // A foreign Origin refused is the protection working, and anyone can repeat
  // it per request; a warning stays in the logs and never reaches Telegram.
  const level = foreignOrigin ? "warn" : "error"
  logger[level](summary, {
    category: foreignOrigin ? "foreign-origin" : "unhandled",
    ...context,
    status,
    ...(!fromApp && {
      requestFacts: requestFacts(request, context.request.path),
    }),
    error: serialized,
  })
}

export async function handleDataRequest(
  response: Response,
  { request }: { request: Request },
) {
  await applyDraftCacheControl(request, response.headers)
  return response
}

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: AppLoadContext,
) {
  await applyDraftCacheControl(request, responseHeaders)

  // https://httpwg.org/specs/rfc9110.html#HEAD
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, {
      status: responseStatusCode,
      headers: responseHeaders,
    })
  }

  return new Promise((resolve, reject) => {
    let shellRendered = false
    const userAgent = request.headers.get("user-agent")

    // Bots and SPA Mode renders wait for all content before responding.
    const readyOption: keyof RenderToPipeableStreamOptions =
      (userAgent && isbot(userAgent)) || routerContext.isSpaMode
        ? "onAllReady"
        : "onShellReady"

    // Abort after streamTimeout so the rejected boundaries have time to flush.
    let timeoutId: ReturnType<typeof setTimeout> | undefined = setTimeout(
      () => abort(),
      streamTimeout + 1000,
    )

    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        [readyOption]() {
          shellRendered = true
          const body = new PassThrough({
            final(callback) {
              // The pending timeout would keep this closure alive.
              clearTimeout(timeoutId)
              timeoutId = undefined
              callback()
            },
          })
          const stream = createReadableStreamFromReadable(body)

          responseHeaders.set("Content-Type", "text/html")

          pipe(body)

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          )
        },
        onShellError(error: unknown) {
          reject(error)
        },
        onError(error: unknown) {
          responseStatusCode = 500
          // Streaming errors after the shell is rendered; shell errors reject
          // and are logged by the caller.
          if (shellRendered) {
            console.error(error)
          }
        },
      },
    )
  })
}
