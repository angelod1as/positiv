import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// The uuid guard is a line each loader and action opts into, so the next route
// with an id param could ship without it and hand Postgres whatever the address
// held. Every route whose path names a param has to call it, unless the param
// is not a uuid column.
const APP = join(process.cwd(), "app")

const NOT_A_UUID = new Set(["token"])

const ROUTE = /route\(\s*"([^"]+)",\s*"([^"]+)"/g
const PARAM = /:(\w+)/g

const routesWithUuidParams = () =>
  [...readFileSync(join(APP, "routes.ts"), "utf-8").matchAll(ROUTE)]
    .map(([, path, file]) => ({
      path,
      file,
      params: [...path.matchAll(PARAM)].map(([, name]) => name),
    }))
    .filter(({ params }) => params.some((name) => !NOT_A_UUID.has(name)))

describe("routes with an id param", () => {
  it("finds the id routes in app/routes.ts", () => {
    expect(routesWithUuidParams().length).toBeGreaterThan(0)
  })

  it("should call assertUuidParams in every one of them", () => {
    const unguarded = routesWithUuidParams()
      .filter(
        ({ file }) =>
          !readFileSync(join(APP, file), "utf-8").includes("assertUuidParams("),
      )
      .map(({ path, file }) => `${path} -> ${file}`)

    expect(unguarded).toEqual([])
  })
})
