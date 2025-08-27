import eslint from "@eslint/js"
import tanstackQuery from "@tanstack/eslint-plugin-query"
import prettier from "eslint-config-prettier"
import oxlint from "eslint-plugin-oxlint"
import globals from "globals"
import tslint from "typescript-eslint"

import { tsConfig, tsxConfigArray } from "./config/eslint/index.js"

/**
 * @type {import('eslint').Linter.Config[]}
 */
export default [
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
			parserOptions: {
				project: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	eslint.configs.recommended,
	prettier,
	// ...tslint.configs.strictTypeChecked,
	// ...tslint.configs.stylisticTypeChecked,
	...tanstackQuery.configs["flat/recommended"],

	// typescript
	tsConfig,
	// jsx
	...tsxConfigArray,
	{
		ignores: ["eslint.config.js", "src/**/openapi.ts", "dist/", "packages/**"],
	},
	...oxlint.buildFromOxlintConfigFile("./.oxlintrc.json"),
]
