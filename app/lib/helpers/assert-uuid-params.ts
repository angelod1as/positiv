const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Postgres throws on a value it cannot cast to uuid rather than answering no
// rows, so an id route reached with anything else is a 404 before any query.
export function assertUuidParams(...values: (string | undefined)[]) {
  if (values.some((value) => value !== undefined && !UUID.test(value))) {
    throw new Response(null, { status: 404 })
  }
}
