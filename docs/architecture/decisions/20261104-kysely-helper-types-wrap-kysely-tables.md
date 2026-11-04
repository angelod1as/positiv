# Kysely helper types wrap Kysely tables

- Status: accepted
- Date: 2026-11-04
- Tags: architecture, development, database

## Context

Kysely's `Selectable`, `Insertable` and `Updateable` derive the read, insert and update shapes of a table from one definition. A TODO asked whether to adopt them. They already work here: `app/types/database/kysely.types.ts` wraps the generated Supabase types in `KyselifyDatabase` from `kysely-supabase`, which turns every column into `ColumnType<Row, Insert, Update>`. So `Selectable<Database["profiles"]>` is the Supabase `Row`, `Insertable` matches `Insert` and `Updateable` is `Update`.

The code that used the helpers mostly wrapped the Supabase `Row` type instead. On a plain row type `Selectable` changes nothing, and `Insertable` makes every column required — `id`, `created_at` and every defaulted column included. The test fixture factories did this, and an `as` cast hid the wrong type.

## Decision

Code that goes through Kysely names its row shapes with the helpers over the Kysely table: `Selectable<Database["payments"]>`, `Insertable<Database["profiles"]>`, `Updateable<Database["events"]>`, where `Database` comes from `~/types/database/kysely.types`. The helpers are never applied to a Supabase `["Row"]` type.

The entity aliases over Supabase `Row` types in `entities.types.ts` (`Profile`, `Event`, `Participant`) stay as they are: they are the same types, and supabase-js code reads them too. Whether everything moves to Kysely is WEB-13's question, not this one.

## Consequences

### Positive

- Insert payloads are typed with the columns that are actually optional, so a fixture or a write can be checked instead of cast.
- One source for the three shapes, regenerated with `pnpm db:types`; no extra codegen and no new dependency.

### Negative

- Two `Database` types coexist, the Supabase one and the Kysely one, and a file that needs both has to alias one of them.

### Neutral

- No runtime change: these are types only.

## Alternatives Considered

1. **kysely-codegen**: generate Kysely types straight from the database.
   - Pros: the native Kysely toolchain, with `Generated<>` columns.
   - Cons: a second generator next to `supabase gen types`, which supabase-js still needs; `kysely-supabase` already gives the same shapes.

2. **Drop the helpers and use Supabase `Row`, `Insert` and `Update` directly.**
   - Pros: one vocabulary across Kysely and supabase-js.
   - Cons: longer lookups (`Database["public"]["Tables"]["x"]["Insert"]`) in Kysely code, and the helpers already in use would be rewritten for nothing.

## References

- <https://kysely.dev/docs/generating-types>
- [kysely-supabase](https://github.com/kysely-org/kysely-supabase)
- [Use Kysely as SQL Query Builder](./20250125-use-kysely-as-sql-query-builder.md)
- WEB-25, WEB-13
