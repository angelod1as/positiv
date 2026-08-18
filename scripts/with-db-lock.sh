#!/usr/bin/env bash
#
# Serializes E2E runs across every worktree of this repository.
#
# The suite drives one shared local Supabase instance and one machine, so two
# runs at once corrupt each other's data and starve each other of CPU. This
# script hands the command it wraps an exclusive turn, plus the run id and the
# free port that turn owns.
set -euo pipefail

WAIT_TIMEOUT="${E2E_LOCK_WAIT_TIMEOUT:-1800}"
STALE_AFTER="${E2E_LOCK_STALE_AFTER:-1800}"
POLL_INTERVAL="${E2E_LOCK_POLL_INTERVAL:-2}"
CLAIM_GRACE="${E2E_LOCK_CLAIM_GRACE:-10}"
FIRST_PORT="${E2E_FIRST_PORT:-5273}"

if [ -n "${E2E_LOCK_DIR:-}" ]; then
  LOCK_DIR="$E2E_LOCK_DIR"
else
  LOCK_DIR="$(git rev-parse --git-common-dir)/e2e-lock"
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
  sed -n "s/^$1=//p" "$OWNER_FILE"
}

lock_dir_age() {
  local mtime
  mtime="$(stat -f %m "$LOCK_DIR" 2>/dev/null || stat -c %Y "$LOCK_DIR" 2>/dev/null || true)"
  [ -n "$mtime" ] || return 1
  echo $(( $(date +%s) - mtime ))
}

# A lock is abandoned when the process that took it is gone or when it is older
# than any real run could be. An owner file that is not there yet usually means
# the winner has not written it, so that only counts once the grace period has
# passed.
lock_is_abandoned() {
  local pid started age dir_age
  pid="$(owner_field pid || true)"
  started="$(owner_field started || true)"

  if [ -z "$pid" ] || [ -z "$started" ]; then
    dir_age="$(lock_dir_age)" || return 1
    [ "$dir_age" -gt "$CLAIM_GRACE" ]
    return
  fi

  if ! kill -0 "$pid" 2>/dev/null; then
    return 0
  fi

  age=$(( $(date +%s) - started ))
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
      echo "🔓 Clearing an abandoned E2E lock ($(describe_holder))" >&2
      rm -rf "$LOCK_DIR"
      continue
    fi

    if [ "$waited" -ge "$WAIT_TIMEOUT" ]; then
      echo "⛔ Gave up waiting ${waited}s for the E2E lock held by $(describe_holder)" >&2
      echo "   Release it by letting that run finish, or remove $LOCK_DIR if it is dead." >&2
      return 1
    fi

    if [ $(( waited % 30 )) -eq 0 ]; then
      echo "⏳ Waiting for the E2E lock held by $(describe_holder)" >&2
    fi

    sleep "$POLL_INTERVAL"
    waited=$(( waited + POLL_INTERVAL ))
  done

  holds_lock=1
  printf 'pid=%s\nworktree=%s\nstarted=%s\n' "$$" "$(pwd)" "$(date +%s)" > "$OWNER_FILE"
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

# Kept short: the id is spent from the 50 character event title budget
export E2E_RUN_ID="${E2E_RUN_ID:-$(printf '%04x%04x' "$(( $(date +%s) % 65536 ))" "$(( $$ % 65536 ))")}"
export E2E_PORT="${E2E_PORT:-$(first_free_port "$FIRST_PORT")}"

echo "🔒 E2E lock acquired — run ${E2E_RUN_ID} on port ${E2E_PORT}" >&2

"$@"
