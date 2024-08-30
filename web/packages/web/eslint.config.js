import Eslint from "@eslint/js"
import tanstackQuery from "@tanstack/eslint-plugin-query"
import Prettier from "eslint-config-prettier"
import Globals from "globals"
import Tslint from "typescript-eslint"

import { tsConfig, tsxConfigArray } from "./config/eslint/index.js"

/**
 * @type {import('eslint').Linter.FlatConfig[]}
 */
export default [
	{
		languageOptions: {
			globals: { ...Globals.browser, ...Globals.node },
			parserOptions: {
				project: ["tsconfig.json"],
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	Eslint.configs.recommended,
	Prettier,
	...Tslint.configs.strictTypeChecked,
	...Tslint.configs.stylisticTypeChecked,
	...tanstackQuery.configs["flat/recommended"],
	// base
	{
		rules: {
			"prefer-const": "off",
		},
	},
	// typescript
	tsConfig,
	// jsx
	...tsxConfigArray,
	{
		ignores: [".output", ".vinxi", "eslint.config.js"],
	},
]
