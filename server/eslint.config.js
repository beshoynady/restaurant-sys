// server/eslint.config.js
// ESLint v9 flat config. Two rule sets:
//   - JavaScript (modules/**, legacy files): lenient, compatible with the
//     existing 570+ file codebase — this is a linter being introduced to an
//     established project, not a project being written under lint from day 1.
//   - TypeScript (utils/, middlewares/, router/v1, and any new/rebuilt
//     module written in TS going forward): strict, type-aware rules.
//
// This config does NOT auto-fix or reformat anything by itself — `eslint`
// only reports; `eslint --fix` is a separate, explicit opt-in script.

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "uploads/**",
      "public/**",
      "images/**",
      "*.zip",
      ".tsbuildinfo",
    ],
  },

  // ---------------------------------------------------------------------
  // JavaScript — existing codebase (modules/**, scripts/, legacy server.js)
  // ---------------------------------------------------------------------
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Deliberately lenient: the existing codebase predates this config.
      // These would otherwise fail loudly on established, working patterns.
      "no-unused-vars": "warn",
      "no-empty": "warn",
      "no-constant-condition": "warn",
    },
  },

  // ---------------------------------------------------------------------
  // TypeScript — infra layer today, every new/rebuilt module going forward
  // ---------------------------------------------------------------------
  ...tseslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.ts"],
  })),
  ...tseslint.configs.stylisticTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.ts"],
  })),
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // NodeNext requires explicit .js extensions in relative TS imports
      // (see BACKEND_FOUNDATION.md) — this is intentional, not a mistake.
      "@typescript-eslint/no-unnecessary-condition": "off",
    },
  },

  // Must be last: disables any stylistic ESLint rule that would conflict
  // with Prettier's formatting decisions.
  eslintConfigPrettier,
);
