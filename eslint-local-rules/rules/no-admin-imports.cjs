// eslint-local-rules/rules/no-admin-imports.js

/**
 * @fileoverview Disallows imports from the admin folder outside of the admin folder.
 */

"use strict"

const path = require("path")

module.exports = {
  meta: {
    type: "problem", // This rule identifies a potential problem
    docs: {
      description:
        "Disallow importing components/modules from the `admin` directory into files outside the `admin` directory.",
      category: "Possible Errors", // Categorize the rule
      recommended: false, // Not part of a recommended set by default
      url: "https://example.com/your-rule-docs", // Placeholder: You can create documentation later
    },
    schema: [], // No options needed for this rule
    messages: {
      forbiddenAdminImport:
        "Imports from the `admin` directory ({{ importedPath }}) are not allowed in files outside of the `admin` directory ({{ currentFilePath }}).",
    },
  },
  create(context) {
    // Get the absolute path of the file currently being linted
    const currentFilePath = path.normalize(context.getFilename())

    // Determine the project root. This assumes ESLint is run from the project's root directory,
    // which is typical for `eslint.config.js` setups.
    const projectRoot = path.normalize(process.cwd())

    /**
     * Resolves an import path, specifically handling the `~/` alias.
     * It assumes `~/` maps directly to the project root.
     * Also handles relative paths (e.g., '../') by resolving them against the current file's directory.
     *
     * @param {string} importPath The raw path from the import declaration (e.g., '~/pages/admin/dashboard-page')
     * @returns {string} The normalized absolute or relative path that can be checked
     */
    const resolveAliasPath = (importPath) => {
      if (importPath.startsWith("~/")) {
        // Resolve `~/` alias relative to the project root
        return path.join(projectRoot, importPath.substring(2))
      }
      if (importPath.startsWith(".")) {
        // Resolve relative paths (e.g., '../component') relative to the current file's directory
        return path.resolve(path.dirname(currentFilePath), importPath)
      }
      // For node modules (e.g., 'react') or other absolute paths, return as is.
      // This rule focuses on file-system based imports.
      return importPath
    }

    /**
     * Checks if a given file path is located within the `/app/pages/admin/` directory.
     * This check is case-insensitive and normalizes path separators for cross-platform compatibility.
     *
     * @param {string} filePath The full path to check
     * @returns {boolean} True if the path is inside the admin directory, false otherwise
     */
    const isAdminDirectoryPath = (filePath) => {
      // Normalize path to use forward slashes and convert to lowercase for consistent comparison
      const normalizedPath = filePath.toLowerCase().replace(/\\/g, "/")
      // The `app/pages/admin/` segment is what we're looking for
      return normalizedPath.includes("/app/pages/admin/")
    }

    return {
      // ESLint AST visitor: this function will be called for every 'ImportDeclaration' node
      ImportDeclaration(node) {
        const importedModuleRawPath = node.source.value // e.g., '~/pages/admin/dashboard-page'

        // Step 1: Resolve the imported module's path to a recognizable file system path
        const resolvedImportedAbsolutePath = resolveAliasPath(
          importedModuleRawPath,
        )

        // Step 2: Check if the resolved imported module path belongs to the admin directory
        const isImportingFromAdmin = isAdminDirectoryPath(
          resolvedImportedAbsolutePath,
        )

        // Step 3: Check if the current file (the one making the import) is *outside* the admin directory
        const isCurrentFileOutsideAdmin = !isAdminDirectoryPath(currentFilePath)

        // Step 4: Apply the rule logic
        // If an import is coming from the admin directory AND the current file is outside admin,
        // then it's a violation.
        if (isImportingFromAdmin && isCurrentFileOutsideAdmin) {
          context.report({
            node: node,
            messageId: "forbiddenAdminImport",
            data: {
              importedPath: importedModuleRawPath, // Show the raw path for clarity in the error message
              currentFilePath: path.relative(projectRoot, currentFilePath), // Show relative path of current file
            },
          })
        }
      },
    }
  },
}
