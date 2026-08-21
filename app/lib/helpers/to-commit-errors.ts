import type { ZodError } from "zod"
import type { CommitError } from "~types/forms/commit.types"

/**
 * A schema's refusals, read as the runtime reads them: one message per
 * question, keyed by the field it belongs to.
 *
 * An issue raised against the object rather than against a field arrives here
 * with an empty question id, which no step owns and no presentation draws — the
 * runtime falls back to its own "could not save". A caller whose schema can
 * refuse the object as a whole has to lift that message into the failure's
 * `message` itself; none of the forms using this does today.
 */
export const toCommitErrors = (error: ZodError): CommitError[] =>
  error.issues.map((issue) => ({
    questionId: String(issue.path[0] ?? ""),
    message: issue.message,
  }))
