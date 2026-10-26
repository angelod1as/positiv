import { describe, expect, it } from "vitest"

import { appFrames } from "./stack-frames.server"

const cwd = process.cwd()

describe("appFrames", () => {
  it("keeps the app's own frames, relative to the project", () => {
    const stack = [
      "TypeError: x",
      "    at node:internal/process/task_queues:105:5",
      `    at loadEvent (${cwd}/app/business/events.server.ts:42:7)`,
      `    at ${cwd}/node_modules/react-router/dist/index.js:900:12`,
      `    at file://${cwd}/app/root.tsx:235:5`,
    ].join("\n")

    expect(appFrames(stack)).toEqual([
      "app/business/events.server.ts:42",
      "app/root.tsx:235",
    ])
  })

  it("finds none in a stack that points only into node_modules", () => {
    const stack = [
      "Error: Bad Request",
      `    at singleFetchAction (${cwd}/node_modules/react-router/dist/development/chunk-H4DAEOV7.mjs:867:31)`,
      "    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)",
    ].join("\n")

    expect(appFrames(stack)).toEqual([])
  })
})
