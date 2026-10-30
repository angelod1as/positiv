import { createRequire } from "node:module"
import { RuleTester } from "eslint"
import { afterAll, describe, it } from "vitest"

const rule = createRequire(import.meta.url)(
  "../eslint-local-rules/rules/require-task-id-on-todos.cjs",
)

RuleTester.afterAll = afterAll
RuleTester.describe = describe
RuleTester.it = it

new RuleTester().run("require-task-id-on-todos", rule, {
  valid: [
    "// TODO: WEB-23 refactor this",
    "// BUG: WEB-24 the toast never shows",
    "// a comment that mentions a TODO in passing",
  ],
  invalid: [
    {
      code: "// TODO: refactor this",
      errors: [{ messageId: "missingTaskId" }],
    },
    {
      code: "// TODO: POS-244 refactor this",
      errors: [{ messageId: "missingTaskId" }],
    },
  ],
})
