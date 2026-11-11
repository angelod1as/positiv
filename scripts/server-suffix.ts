import type { RouteConfigEntry } from "@react-router/dev/routes"
import type { IModule } from "dependency-cruiser"

const SERVER_SUFFIX = /\.server\.[jt]sx?$/
const SERVER_ONLY_PACKAGE = /(^|\/)node_modules\/(pg|kysely|nodemailer)\//
const TEST = /(\.(test|spec)\.tsx?$)|(^app\/test\/)/
const ROOT_ROUTE = "app/root.tsx"

export function routeModuleFiles(routes: RouteConfigEntry[]): Set<string> {
  return new Set(
    routes.flatMap((route) => [
      `app/${route.file}`,
      ...routeModuleFiles(route.children ?? []),
    ]),
  )
}

/**
 * A file that imports a server-only module carries the .server suffix, so
 * the bundler refuses to ship it to the browser. Type-only imports are
 * erased, tests never reach the bundle, and React Router strips loader and
 * action from route modules, root included.
 */
export function findServerSuffixViolations(
  modules: IModule[],
  routeModules: Set<string>,
): string[] {
  return modules
    .filter(
      ({ source }) =>
        source.startsWith("app/") &&
        !SERVER_SUFFIX.test(source) &&
        !TEST.test(source) &&
        source !== ROOT_ROUTE &&
        !routeModules.has(source),
    )
    .flatMap(({ source, dependencies }) =>
      dependencies
        .filter(
          ({ resolved, dependencyTypes }) =>
            !dependencyTypes.includes("type-only") &&
            (SERVER_SUFFIX.test(resolved) || SERVER_ONLY_PACKAGE.test(resolved)),
        )
        .map(({ resolved }) => `${source} imports ${resolved}`),
    )
}
