#!/usr/bin/env bash
#
# Serializes the test suites that reach the database, across every worktree.
#
# The E2E and integration suites drive one shared local Supabase instance, so
# two of them at once corrupt each other's data, and two E2E runs also starve
# each other of CPU. This script hands the command it wraps an exclusive turn,
# plus the run id and the free port that turn owns.
set -euo pipefail

WAIT_TIMEOUT="${DB_LOCK_WAIT_TIMEOUT:-1800}"
STALE_AFTER="${DB_LOCK_STALE_AFTER:-1800}"
POLL_INTERVAL="${DB_LOCK_POLL_INTERVAL:-2}"
CLAIM_GRACE="${DB_LOCK_CLAIM_GRACE:-10}"
FIRST_PORT="${E2E_FIRST_PORT:-5273}"

is_whole_number() {
  case "$1" in
    '' | *[!0-9]* | 0?* | ???????????*) return 1 ;;
    *) return 0 ;;
  esac
}

for setting in DB_LOCK_WAIT_TIMEOUT DB_LOCK_STALE_AFTER DB_LOCK_POLL_INTERVAL DB_LOCK_CLAIM_GRACE E2E_FIRST_PORT; do
  if [ -n "${!setting:-}" ] && ! is_whole_number "${!setting}"; then
    echo "⛔ ${setting} must be a whole number without leading zeros, got '${!setting}'" >&2
    exit 1
  fi
done

if [ "$POLL_INTERVAL" -lt 1 ]; then
  echo "⛔ DB_LOCK_POLL_INTERVAL must be at least 1, got '$POLL_INTERVAL'" >&2
  exit 1
fi

if [ -n "${DB_LOCK_DIR:-}" ]; then
  LOCK_DIR="$DB_LOCK_DIR"
else
  LOCK_DIR="$(git rev-parse --git-common-dir)/db-lock"
fi

OWNER_FILE="$LOCK_DIR/owner"
holds_lock=0

release_lock() {
  if [ "$holds_lock" = "1" ]; then
    rm -rf "$LOCK_DIR"
    holds_lock=0
  fi
}

trap release_lock EXIT INT TERM

owner_field() {
  [ -f "$OWNER_FILE" ] || return 1
  local value
  value="$(sed -n "s/^$1=//p" "$OWNER_FILE")"
  is_whole_number "$value" || return 1
  echo "$value"
}

lock_dir_age() {
  local mtime
  mtime="$(stat -c %Y "$LOCK_DIR" 2>/dev/null || stat -f %m "$LOCK_DIR" 2>/dev/null || true)"
  is_whole_number "$mtime" || return 1
  echo $(( $(date +%s) - mtime ))
}

# A lock is abandoned when the process that took it is gone or when it is older
# than any real run could be. An owner file that is not there yet usually means
# the winner has not written it, so that only counts once the grace period has
# passed. A live owner without a readable start time is aged by its directory.
lock_is_abandoned() {
  local pid started age dir_age
  pid="$(owner_field pid || true)"
  started="$(owner_field started || true)"

  if [ -z "$pid" ]; then
    dir_age="$(lock_dir_age)" || return 1
    [ "$dir_age" -gt "$CLAIM_GRACE" ]
    return
  fi

  if ! kill -0 "$pid" 2>/dev/null; then
    return 0
  fi

  if [ -n "$started" ]; then
    age=$(( $(date +%s) - started ))
  else
    age="$(lock_dir_age)" || return 1
  fi
  [ "$age" -gt "$STALE_AFTER" ]
}

describe_holder() {
  local pid worktree started
  pid="$(owner_field pid || true)"
  worktree="$(owner_field worktree || true)"
  started="$(owner_field started || true)"

  if [ -z "$pid" ]; then
    echo "another run"
    return
  fi

  echo "pid $pid in ${worktree:-an unknown worktree}, running for $(( $(date +%s) - ${started:-0} ))s"
}

acquire_lock() {
  local waited=0

  while ! mkdir "$LOCK_DIR" 2>/dev/null; do
    if lock_is_abandoned; then
      echo "🔓 Clearing an abandoned database lock ($(describe_holder))" >&2
      rm -rf "$LOCK_DIR"
      continue
    fi

    if [ "$waited" -ge "$WAIT_TIMEOUT" ]; then
      echo "⛔ Gave up waiting ${waited}s for the database lock held by $(describe_holder)" >&2
      echo "   Release it by letting that run finish, or remove $LOCK_DIR if it is dead." >&2
      return 1
    fi

    if [ $(( waited % 30 )) -eq 0 ]; then
      echo "⏳ Waiting for the database lock held by $(describe_holder)" >&2
    fi

    sleep "$POLL_INTERVAL"
    waited=$(( waited + POLL_INTERVAL ))
  done

  holds_lock=1
  printf 'pid=%s\nworktree=%s\nstarted=%s\n' "$$" "$(pwd)" "$(date +%s)" > "$OWNER_FILE.$$"
  mv "$OWNER_FILE.$$" "$OWNER_FILE"
}

port_is_free() {
  ! (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null
}

first_free_port() {
  local port="$1"

  while [ "$port" -lt 65535 ]; do
    if port_is_free "$port"; then
      echo "$port"
      return 0
    fi
    port=$(( port + 1 ))
  done

  echo "⛔ No free port found from $1 upwards" >&2
  return 1
}

acquire_lock

if [ "$holds_lock" != "1" ] || [ "$(owner_field pid || true)" != "$$" ]; then
  echo "⛔ Could not confirm this run holds the database lock; not running unlocked" >&2
  holds_lock=0
  exit 1
fi

# Kept short: the id is spent from the 50 character event title budget
export E2E_RUN_ID="${E2E_RUN_ID:-$(printf '%04x%04x' "$(( $(date +%s) % 65536 ))" "$(( $$ % 65536 ))")}"
export E2E_PORT="${E2E_PORT:-$(first_free_port "$FIRST_PORT")}"

echo "🔒 Database lock acquired — run ${E2E_RUN_ID} on port ${E2E_PORT}" >&2

"$@"
