// eslint-local-rules/index.cjs

/**
 * @fileoverview Disallows imports from the admin folder outside of the admin folder.
 * @author Your Name
 */

"use strict"

module.exports = {
  // Define the rules provided by this plugin
  rules: {
    "no-admin-imports": require("./rules/no-admin-imports.cjs"),
    "require-task-id-on-todos": require("./rules/require-task-id-on-todos.cjs"),
  },
}
