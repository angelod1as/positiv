import js from "@eslint/js"
import pluginReact from "eslint-plugin-react"
import reactRefresh from "eslint-plugin-react-refresh"
import unusedImports from "eslint-plugin-unused-imports"
import { defineConfig, globalIgnores } from "eslint/config"
import globals from "globals"
import { createRequire } from "node:module"
import tseslint from "typescript-eslint"

// Use createRequire to load the commonjs local plugin.
const require = createRequire(import.meta.url)
const localRulesPlugin = require("./eslint-local-rules/index.cjs")

export default defineConfig([
  // 1. Global Ignores: Files and directories that ESLint should completely ignore.
  globalIgnores(["./.react-router/*", "./build/*", "./playwright-report/*", "./supabase/functions/**/*", "./linear-api/*"]),

  // 2. Base Configuration for all files (JS/TS/JSX/TSX) that are not specifically overridden.
  //    This block handles general JS rules, unused imports, and your custom rule.
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      js,
      "unused-imports": unusedImports,
      "local-rules": localRulesPlugin, // Your custom local plugin
    },
    extends: [
      js.configs.recommended, // Basic JavaScript recommended rules
    ],
    rules: {
      "no-console": [
        "error",
        {
          allow: ["warn", "error", "info", "dir"],
        },
      ],
      "no-empty-pattern": "off",

      // Rules for unused-imports
      "no-unused-vars": "off", // Turn off ESLint's default rule
      // @typescript-eslint/no-unused-vars will be managed in the TS specific block
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true, // This allows unused rest siblings for unused-imports
        },
      ],

      // Your custom rule for admin imports (applies to all relevant file types)
      "local-rules/no-admin-imports": "error",
      "local-rules/require-task-id-on-todos": "error",
    },
  },

  // 3. TypeScript Specific Configuration: Applies `tseslint.parser` and `parserOptions.project`
  {
    files: ["**/*.{ts,tsx}"], // Only apply to TypeScript and TSX files
    languageOptions: {
      parser: tseslint.parser, // Specify TypeScript parser
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: true, // Enable type-aware linting
        tsconfigRootDir: import.meta.dirname, // Point to the directory containing tsconfig.json
      },
    },
    extends: [
      ...tseslint.configs.strict, // Strict TypeScript rules
    ],
    rules: {
      // Re-enable `@typescript-eslint/no-unused-vars` here, as `tseslint.configs.strict`
      // will provide good unused variable detection for TypeScript.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  // 4. React Specific Configuration: Applies `pluginReact` and related rules
  {
    files: ["**/*.{jsx,tsx}"], // Only apply React rules to JSX/TSX files
    plugins: {
      react: pluginReact, // Explicitly declare the react plugin here
    },
    ...pluginReact.configs.flat.recommended, // React recommended rules
    settings: {
      react: {
        version: "detect", // Automatically detect React version
      },
    },
    rules: {
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/no-unescaped-entities": "off",
      "react/self-closing-comp": "error",
    },
  },

  // 5. React Refresh Configuration: For Vite development
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"], // Apply to all applicable files for refresh
    ...reactRefresh.configs.vite,
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

  // 6. Override for CommonJS files (your local ESLint rules)
  // This must come after the general TS rules to override them,
  // especially for `no-require-imports` and `no-var-requires`.
  {
    files: ["eslint-local-rules/**/*.cjs", "eslint.config.js"], // Target .cjs and eslint.config.js itself
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
    },
  },
])
