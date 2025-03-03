import pluginJs from "@eslint/js"
import prettier from "eslint-config-prettier"
import oxlint from "eslint-plugin-oxlint"
import globals from "globals"
import tseslint from "typescript-eslint"
export default tseslint.config(
  pluginJs.configs.recommended,
  prettier,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  oxlint.configs["flat/recommended"],
  oxlint.configs["flat/typescript"],
  oxlint.configs["flat/unicorn"],
  oxlint.configs["flat/import"],
  oxlint.configs["flat/jsdoc"],
  {
    rules: {
      "@typescript-eslint/no-empty-object-type": [
        "error",
        {
          allowInterfaces: "always",
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          fixStyle: "inline-type-imports",
        },
      ],
      "@typescript-eslint/restrict-template-expressions": [
        "warn",
        {
          allowNumber: true,
        },
      ],
    },
  },
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: {
          defaultProject: "tsconfig.json",
          allowDefaultProject: ["eslint.config.js"],
        },
        tsconfigRootDir: process.cwd(),
      },
    },
  },
)
