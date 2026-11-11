import { existsSync } from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { cruise, type ICruiseResult, type IModule } from "dependency-cruiser"
import extractDepcruiseOptions from "dependency-cruiser/config-utl/extract-depcruise-options"
import extractTSConfig from "dependency-cruiser/config-utl/extract-ts-config"

export type Violation = { rule: string; from: string; to: string }

export type DomainCycle = { domains: string[]; imports: string[] }

const DOMAIN = /^app\/business\/([^/]+)\//
const TEST = /(\.(test|spec)\.tsx?$)|(^app\/test\/)/

const domainOf = (file: string) => DOMAIN.exec(file)?.[1]

/**
 * dependency-cruiser finds cycles between modules only, and two domains can
 * import each other through four different files without any module cycle.
 * So the import graph is collapsed to one node per business domain, counting
 * every import (type-only and test files included), and each strongly
 * connected component with more than one domain is a cycle.
 */
export function findDomainCycles(modules: IModule[]): DomainCycle[] {
  const edges = new Map<string, Map<string, string[]>>()
  for (const module of modules) {
    const from = domainOf(module.source)
    if (!from) continue
    for (const dependency of module.dependencies) {
      const to = domainOf(dependency.resolved)
      if (!to || to === from) continue
      const targets = edges.get(from) ?? new Map<string, string[]>()
      edges.set(from, targets)
      const imports = targets.get(to) ?? []
      targets.set(to, imports)
      imports.push(
        `${module.source} → ${dependency.resolved}${TEST.test(module.source) ? " (test)" : ""}`,
      )
    }
  }

  const index = new Map<string, number>()
  const lowLink = new Map<string, number>()
  const stack: string[] = []
  const onStack = new Set<string>()
  const components: string[][] = []

  const connect = (domain: string) => {
    index.set(domain, index.size)
    lowLink.set(domain, index.get(domain) as number)
    stack.push(domain)
    onStack.add(domain)

    for (const target of edges.get(domain)?.keys() ?? []) {
      if (!index.has(target)) {
        connect(target)
        lowLink.set(
          domain,
          Math.min(lowLink.get(domain) as number, lowLink.get(target) as number),
        )
      } else if (onStack.has(target)) {
        lowLink.set(
          domain,
          Math.min(lowLink.get(domain) as number, index.get(target) as number),
        )
      }
    }

    if (lowLink.get(domain) === index.get(domain)) {
      const component: string[] = []
      let member: string | undefined
      do {
        member = stack.pop() as string
        onStack.delete(member)
        component.push(member)
      } while (member !== domain)
      if (component.length > 1) components.push(component.sort())
    }
  }

  for (const domain of edges.keys()) {
    if (!index.has(domain)) connect(domain)
  }

  return components.map((domains) => ({
    domains,
    imports: domains.flatMap((from) =>
      domains.flatMap((to) => edges.get(from)?.get(to) ?? []),
    ),
  }))
}

type CruiseTarget = { baseDir: string; configFile: string }

export async function cruiseApp({ baseDir, configFile }: CruiseTarget) {
  const tsConfigFile = path.join(baseDir, "tsconfig.json")
  const hasTsConfig = existsSync(tsConfigFile)
  const options = {
    ...(await extractDepcruiseOptions(configFile)),
    baseDir,
    ...(hasTsConfig && { tsConfig: { fileName: tsConfigFile } }),
  }

  const { output } = await cruise(
    ["app"],
    options,
    {},
    hasTsConfig ? { tsConfig: extractTSConfig(tsConfigFile) } : {},
  )
  return output as ICruiseResult
}

export async function checkDependencies(target: CruiseTarget) {
  const result = await cruiseApp(target)

  return {
    violations: result.summary.violations.map(
      (violation): Violation => ({
        rule: violation.rule.name,
        from: violation.from,
        to: violation.to,
      }),
    ),
    domainCycles: findDomainCycles(result.modules),
    modules: result.modules,
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const root = path.resolve(import.meta.dirname, "..")
  const { violations, domainCycles, modules } = await checkDependencies({
    baseDir: root,
    configFile: path.join(root, ".dependency-cruiser.mjs"),
  })
  const { default: routes } = await import("../app/routes")
  const { findServerSuffixViolations, routeModuleFiles } = await import(
    "./server-suffix"
  )
  const suffixViolations = findServerSuffixViolations(
    modules,
    routeModuleFiles(routes),
  )

  for (const { rule, from, to } of violations) {
    console.error(`✖ ${rule}: ${from} → ${to}`)
  }
  for (const { domains, imports } of domainCycles) {
    console.error(`✖ domain-cycle: ${domains.join(" ↔ ")}`)
    for (const line of imports) console.error(`    ${line}`)
  }

  for (const line of suffixViolations) {
    console.error(`✖ server-suffix: ${line}, so it needs the .server suffix`)
  }

  const problems =
    violations.length + domainCycles.length + suffixViolations.length
  if (problems > 0) {
    console.error(
      `\n${problems} dependency problem(s). The rules: docs/architecture/decisions/20261106-server-side-code-is-organized-by-domain.md`,
    )
    process.exit(1)
  }
  console.info("✔ dependencies follow the domain rules")
}
