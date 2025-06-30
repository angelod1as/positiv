// eslint-local-rules/rules/require-task-id-on-todos.cjs

/**
 * @fileoverview Ensures that specific keywords in line comments (e.g., TODO:) are followed by a POS- task ID.
 * @author Your Name
 */

"use strict"

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce that specific keywords in line comments (e.g., TODO:) are followed by a POS- task ID.",
      category: "Stylistic Issues",
      recommended: false,
      url: "https://example.com/your-rule-docs", // Placeholder for your rule documentation
    },
    schema: [], // No options needed for this rule
    messages: {
      missingTaskId:
        "Comments with '{{ keyword }}' must include a Linear task ID in the format 'POS-[number]'. See README for Linear URL.",
    },
  },
  create(context) {
    // Define the keywords we are looking for.
    // Making them case-insensitive for matching flexibility in the comment text.
    const keywords = ["BUG", "TODO", "URGENT", "REFACTOR", "TYPE", "QUESTION"]

    // Regular expression to find "POS-" followed by one or more digits
    const taskIdPattern = /POS-\d+/

    return {
      // ESLint AST visitor: this function is called for every program (root node of the AST)
      Program() {
        const sourceCode = context.getSourceCode()
        // Get all comments in the file
        const comments = sourceCode.getAllComments()

        comments.forEach((comment) => {
          // We are only interested in line comments (//) as per the requirement
          if (comment.type === "Line") {
            const commentText = comment.value.trim() // Get comment text, trim whitespace

            // Check if the comment starts with one of our keywords (case-insensitive)
            let matchedKeyword = null
            for (const keyword of keywords) {
              // The regex specifically looks for the EXACT uppercase keyword
              // at the start of the trimmed comment, followed by a word boundary,
              // and then optionally a colon, whitespace, or the end of the string.
              const keywordRegex = new RegExp(`^${keyword}\\b(?:[:\\s].*)?$`) // Matches "KEYWORD", "KEYWORD:", "KEYWORD: some text"
              if (keywordRegex.test(commentText)) {
                matchedKeyword = keyword // Use the exact keyword for the message
                break
              }
            }

            // If a relevant keyword is found, check for the task ID
            if (matchedKeyword) {
              if (!taskIdPattern.test(commentText)) {
                context.report({
                  node: comment, // Report on the comment node itself
                  messageId: "missingTaskId",
                  data: {
                    keyword: matchedKeyword,
                  },
                })
              }
            }
          }
        })
      },
    }
  },
}
