import Eslint from "@eslint/js"
import Prettier from "eslint-config-prettier"
import Oxlint from "eslint-plugin-oxlint"
import Globals from "globals"
import Tslint from "typescript-eslint"
import { tsConfig, tsxConfig } from "./config/eslint/index.js"

/**
 * @type {import('eslint').Linter.FlatConfig[]}
 */
export default [
	{
		languageOptions: {
			globals: { ...Globals.browser, ...Globals.node },
			parserOptions: {
				project: ["tsconfig.json"],
			},
		},
	},
	Eslint.configs.recommended,
	Prettier,
	...Tslint.configs.strictTypeChecked,
	...Tslint.configs.stylisticTypeChecked,
	// base
	{
		rules: {
			"prefer-const": "off",
		},
	},
	// typescript
	tsConfig,
	// jsx
	tsxConfig,
	{
		ignores: [".output/", ".vinxi/"],
	},
	Oxlint.configs["flat/recommended"],
]
