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

export type CommitResult =
  | { ok: true }
  | {
      ok: false
      errors: CommitError[]
      /**
       * Why the save was refused, when no question is to blame — registration
       * closed between the quiz and the button, say. The runtime shows it in
       * place of its own "could not save", which would tell someone to retry
       * something retrying cannot fix.
       */
      message?: string
    }
