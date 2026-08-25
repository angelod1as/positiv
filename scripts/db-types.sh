#!/bin/sh
# Don't forget to chmod +x this file :)
set -eu

OUT="${DB_TYPES_OUT:-app/types/database/database.types.ts}"
SUPABASE="${SUPABASE_BIN:-pnpx supabase}"

echo "Generating Types from Supabase"

if [ "${1:-}" = "--local" ]; then
  # Ask the running stack for its own connection string. Left to work it out,
  # the CLI hands the container it spawns a password the running database has
  # never had, and generation dies with "password authentication failed".
  DB_URL=$($SUPABASE status -o json | sed -n 's/.*"DB_URL": *"\([^"]*\)".*/\1/p')
  if [ -z "$DB_URL" ]; then
    echo "Could not read DB_URL from supabase status. Is the local stack up?" >&2
    exit 1
  fi
  set -- gen types typescript --db-url "$DB_URL" --schema public
else
  . ./.env
  set -- gen types typescript --project-id "$SUPABASE_PROJECT_ID" --schema public
fi

# Generated into a temporary file first. Redirecting straight into the
# checked-in one truncates it before the command has run, so any failure leaves
# the repository holding an error message where its database types used to be.
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

$SUPABASE "$@" > "$TMP"

if ! grep -q "export type Database" "$TMP"; then
  echo "Supabase answered with something that is not a type module. $OUT left alone:" >&2
  head -c 200 "$TMP" >&2
  echo >&2
  exit 1
fi

cat "$TMP" > "$OUT"

echo "Supabase types generation complete."
