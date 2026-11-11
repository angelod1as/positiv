import path from "node:path"
import type { IDependency, IModule } from "dependency-cruiser"
import { describe, expect, it } from "vitest"
import routes from "../app/routes"
import { cruiseApp } from "./check-dependencies"
import { findServerSuffixViolations, routeModuleFiles } from "./server-suffix"

const repo = path.resolve(import.meta.dirname, "..")

const dependency = (
  resolved: string,
  dependencyTypes: IDependency["dependencyTypes"] = ["local", "import"],
) => ({ resolved, dependencyTypes }) as IDependency

const module = (source: string, dependencies: IDependency[]) =>
  ({ source, dependencies }) as IModule

const noRoutes = new Set<string>()

describe("findServerSuffixViolations", () => {
  it.each([
    ["a .server module", "app/business/auth/auth.server.ts"],
    ["pg", "node_modules/.pnpm/pg@8.16.3/node_modules/pg/lib/index.js"],
    ["kysely", "node_modules/.pnpm/kysely@0.28.2/node_modules/kysely/dist/esm/index.js"],
    ["nodemailer", "node_modules/.pnpm/nodemailer@7.0.5/node_modules/nodemailer/lib/nodemailer.js"],
  ])("flags a file without the suffix that imports %s", (_, resolved) => {
    expect(
      findServerSuffixViolations(
        [module("app/lib/helpers/session.ts", [dependency(resolved)])],
        noRoutes,
      ),
    ).toEqual([`app/lib/helpers/session.ts imports ${resolved}`])
  })

  it("accepts a file that carries the suffix", () => {
    expect(
      findServerSuffixViolations(
        [
          module("app/lib/helpers/session.server.ts", [
            dependency("app/lib/supabase/db.server.ts"),
          ]),
        ],
        noRoutes,
      ),
    ).toEqual([])
  })

  it("accepts a type-only import, which the build erases", () => {
    expect(
      findServerSuffixViolations(
        [
          module("app/lib/helpers/download.ts", [
            dependency("app/business/application/event-participants.server.ts", [
              "local",
              "type-only",
              "import",
            ]),
          ]),
        ],
        noRoutes,
      ),
    ).toEqual([])
  })

  it("accepts route modules, whose loader and action React Router strips", () => {
    expect(
      findServerSuffixViolations(
        [
          module("app/pages/account/account-page.tsx", [
            dependency("app/business/auth/auth.server.ts"),
          ]),
          module("app/root.tsx", [dependency("app/business/auth/auth.server.ts")]),
        ],
        new Set(["app/pages/account/account-page.tsx"]),
      ),
    ).toEqual([])
  })

  it("accepts tests, which never reach the client bundle", () => {
    expect(
      findServerSuffixViolations(
        [
          module("app/pages/account/account-page.test.tsx", [
            dependency("app/business/auth/auth.server.ts"),
          ]),
          module("app/test/db-test-utils.ts", [
            dependency("node_modules/.pnpm/pg@8.16.3/node_modules/pg/lib/index.js"),
          ]),
        ],
        noRoutes,
      ),
    ).toEqual([])
  })

  it("accepts a client module importing a client module", () => {
    expect(
      findServerSuffixViolations(
        [module("app/lib/helpers/cpf.ts", [dependency("app/lib/helpers/format.ts")])],
        noRoutes,
      ),
    ).toEqual([])
  })
})

describe("routeModuleFiles", () => {
  it("lists every file app/routes.ts registers, nested ones included", () => {
    const files = routeModuleFiles(routes)

    expect(files).toContain("app/pages/api/payment/webhook.ts")
    expect(files).toContain("app/pages/admin/settings/settings-page.tsx")
    expect(files.size).toBeGreaterThan(50)
  })
})

it("every file that imports a server-only module carries .server", { timeout: 120_000 }, async () => {
  const { modules } = await cruiseApp({
    baseDir: repo,
    configFile: path.join(repo, ".dependency-cruiser.mjs"),
  })

  expect(findServerSuffixViolations(modules, routeModuleFiles(routes))).toEqual([])
})
