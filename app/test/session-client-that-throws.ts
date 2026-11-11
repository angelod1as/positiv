// Code that goes through Kysely alone never touches the session client. One
// that throws on use proves it, and keeps the service_role -- which would mask
// any missing check -- out of the test.
export const sessionClientThatThrows = (caller: string) =>
  new Proxy(
    {},
    {
      get() {
        throw new Error(`${caller} must not reach supabase-js`)
      },
    },
  )
