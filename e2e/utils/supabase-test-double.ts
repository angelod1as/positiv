export interface RecordedOperation {
  name: string
  args: unknown[]
}

export interface RecordedQuery {
  table: string
  operations: RecordedOperation[]
}

export interface SupabaseDouble {
  client: unknown
  queries: RecordedQuery[]
  find(table: string, operation: string): RecordedQuery | undefined
  argumentsOf(table: string, operation: string): unknown[] | undefined
}

/**
 * Records the query chain each caller builds and resolves it with whatever
 * `respond` returns, so tests can assert on the filters a cleanup routine
 * applies without touching the shared local database.
 */
export function createSupabaseDouble(
  respond: (query: RecordedQuery) => unknown = () => ({ data: [], error: null }),
  auth: Record<string, unknown> = {}
): SupabaseDouble {
  const queries: RecordedQuery[] = []

  const client = {
    from(table: string) {
      const query: RecordedQuery = { table, operations: [] }
      queries.push(query)

      const builder: unknown = new Proxy(
        {},
        {
          get(_target, property) {
            if (typeof property !== 'string') return undefined

            if (property === 'then') {
              return (onFulfilled: (value: unknown) => unknown, onRejected: (reason: unknown) => unknown) =>
                Promise.resolve()
                  .then(() => respond(query))
                  .then(onFulfilled, onRejected)
            }

            return (...args: unknown[]) => {
              query.operations.push({ name: property, args })
              return builder
            }
          },
        }
      )

      return builder
    },
    auth,
    rpc: () => Promise.resolve({ data: null, error: null }),
  }

  const find = (table: string, operation: string) =>
    queries.find(query => query.table === table && query.operations.some(op => op.name === operation))

  return {
    client,
    queries,
    find,
    argumentsOf(table: string, operation: string) {
      return find(table, operation)?.operations.find(op => op.name === operation)?.args
    },
  }
}
