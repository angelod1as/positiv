import { isInputError, type Result } from "composable-functions"
import type { CommitError, CommitResult } from "~types/forms/commit.types"

/**
 * A composable's answer, read as the form runtime reads one.
 *
 * The mutations behind the admin forms are composables, called directly by
 * integration suites that check what they write to the database. Rewriting them
 * to answer with a `CommitResult` would rewrite those suites for nothing, so
 * the translation happens here instead — once, where the two contracts meet.
 *
 * An error that names an input belongs to the question that asked for it. One
 * that names nothing belongs to the whole save, and is said in place of the
 * runtime's own "could not save", which would tell someone to retry something
 * retrying cannot fix.
 */
export function toCommitResult(result: Result<unknown>): CommitResult {
  if (result.success) return { ok: true }

  const errors: CommitError[] = []
  let message: string | undefined

  for (const error of result.errors) {
    if (isInputError(error)) {
      errors.push({
        questionId: String(error.path[0] ?? ""),
        message: error.message,
      })
      continue
    }

    message ??= error.message
  }

  return message ? { ok: false, errors, message } : { ok: false, errors }
}
