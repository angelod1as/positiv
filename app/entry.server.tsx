import { PassThrough } from "node:stream"

import { createReadableStreamFromReadable } from "@react-router/node"
import { isbot } from "isbot"
import type { RenderToPipeableStreamOptions } from "react-dom/server"
import { renderToPipeableStream } from "react-dom/server"
import type { AppLoadContext, EntryContext } from "react-router"
import { ServerRouter } from "react-router"
import { applyDraftCacheControl } from "./business/cms/draft-mode.server"

export const streamTimeout = 5_000

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
