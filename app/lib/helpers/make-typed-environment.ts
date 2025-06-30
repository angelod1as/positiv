import type { CamelKeys } from "string-ts"
import { camelKeys } from "string-ts"

/**
 * Creates a typed environment function that parses, camelCases, and caches the arguments.
 * @param schema - The schema used to parse the arguments.
 * @returns A function that takes arguments and returns a typed environment.
 */
export function makeTypedEnvironment<T>(schema: { parse: (u: unknown) => T }) {
  let env: CamelKeys<T>
  // args will usually be process.env but can be any object
  return (args: Record<string, unknown>) => {
    // if the env is already set, return it
    if (env) return env
    // if the env is not set, parse the args and camelCase them
    env = camelKeys(schema.parse(args))
    return env
  }
}
