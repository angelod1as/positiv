import type { ZodError } from "zod"
import type { CommitError } from "~types/forms/commit.types"

/**
 * A schema's refusals, read as the runtime reads them: one message per
 * question, keyed by the field it belongs to. An issue raised against the
 * object rather than against a field names no question, which is what the
 * runtime shows as the form's own error.
 */
export const toCommitErrors = (error: ZodError): CommitError[] =>
  error.issues.map((issue) => ({
    questionId: String(issue.path[0] ?? ""),
    message: issue.message,
  }))
