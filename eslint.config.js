import js from "@eslint/js"
import pluginReact from "eslint-plugin-react"
import reactRefresh from "eslint-plugin-react-refresh"
import unusedImports from "eslint-plugin-unused-imports"
import { defineConfig, globalIgnores } from "eslint/config"
import globals from "globals"
import { createRequire } from "node:module" // Needed to import commonjs modules in ES modules config
import tseslint from "typescript-eslint"

// Use createRequire to load the commonjs local plugin.
// The path should be relative to where your eslint.config.js is located.
const require = createRequire(import.meta.url)
const localRulesPlugin = require("./eslint-local-rules/index.cjs") // Point to the .cjs entry file

export default defineConfig([
  globalIgnores(["./.react-router/*", "./build/*", "./playwright-report/*"]),
  reactRefresh.configs.vite,
  {
    rules: {
      "react-refresh/only-export-components": [
        "error",
        {
          allowExportNames: [
            "meta",
            "links",
            "headers",
            "loader",
            "action",
            "clientLoader",
            "clientAction",
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  tseslint.configs.strict,
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    plugins: {
      js,
      "unused-imports": unusedImports,
      "local-rules": localRulesPlugin, // Register your custom local plugin here
    },
    extends: ["js/recommended"],
    rules: {
      // For unusedImports
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      // Enable your custom rule here
      "local-rules/no-admin-imports": "error",
    },
  },
  {
    ...pluginReact.configs.flat.recommended,
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    // General rules
    rules: {
      "no-console": [
        "error",
        {
          allow: ["warn", "error", "info", "dir"],
        },
      ],
      "no-empty-pattern": "off",
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react/no-unescaped-entities": "off",
      "react/self-closing-comp": "error",
      "react/prop-types": "off",
    },
  },
  {
    files: ["eslint-local-rules/**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
])
