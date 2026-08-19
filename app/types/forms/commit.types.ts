/**
 * What a save answers with. Shared between the server functions that perform
 * one and the form runtime that reads the result, so neither has to import the
 * other: a rejection names the question it belongs to, and the runtime draws
 * the message under exactly that question.
 */
export type CommitError = {
  questionId: string
  message: string
}

export type CommitResult = { ok: true } | { ok: false; errors: CommitError[] }
