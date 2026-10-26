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

// The react-router 7.6.3 framework default (npx react-router reveal), with two
// additions: applyDraftCacheControl on both the document response
// (handleRequest) and the client-navigation data responses
// (handleDataRequest), so a draft render is never cached and served to a
// visitor; and handleError, so unhandled server errors reach the logger (and
// Telegram), skipping 4xx route responses. Re-reveal and re-diff when
// upgrading react-router.
export const streamTimeout = 5_000

export const handleError: HandleErrorFunction = (
  error,
  { request, params },
) => {
  if (request.signal.aborted) return
  if (isRouteErrorResponse(error) && error.status < 500) return
  const context = requestContext(request, params)
  const serialized = serializeError(error)
  const { status, summary } = describeFailure(
    serialized,
    request,
    context.request.path,
  )
  const fromApp =
    serialized.stack !== undefined && appFrames(serialized.stack).length > 0
  logger.error(summary, {
    category: "unhandled",
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

  return new Promise((resolve, reject) => {
    let shellRendered = false
    const userAgent = request.headers.get("user-agent")

    // Bots and SPA Mode renders wait for all content before responding.
    const readyOption: keyof RenderToPipeableStreamOptions =
      (userAgent && isbot(userAgent)) || routerContext.isSpaMode
        ? "onAllReady"
        : "onShellReady"

    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        [readyOption]() {
          shellRendered = true
          const body = new PassThrough()
          const stream = createReadableStreamFromReadable(body)

          responseHeaders.set("Content-Type", "text/html")

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          )

          pipe(body)
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

    setTimeout(abort, streamTimeout + 1000)
  })
}
