import eslint from "@eslint/js"
import tanstackQuery from "@tanstack/eslint-plugin-query"
import { rules } from "eslint-config-prettier"
import jsxA11y from "eslint-plugin-jsx-a11y"
import oxlint from "eslint-plugin-oxlint"
import { globalIgnores } from "eslint/config"
import globals from "globals"

import { tsConfig, tsxConfigArray } from "./config/eslint/index.js"

/**
 * @type {import('eslint').Linter.Config[]}
 */
export default [
	jsxA11y.flatConfigs.recommended,

	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
			parserOptions: {
				project: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			"jsx-a11y/no-noninteractive-element-to-interactive-role": "warn",
		},
	},
	eslint.configs.recommended,
	// ...tslint.configs.strictTypeChecked,
	// ...tslint.configs.stylisticTypeChecked,
	...tanstackQuery.configs["flat/recommended"],

	// typescript
	tsConfig,
	// jsx
	...tsxConfigArray,
	{
		ignores: [
			"eslint.config.js",
			"src/**/openapi.ts",
			"dist/",
			"packages/",
			".storybook/",
			"plugins/",
			"src/component/__legacy/",
			"**/*.stories.tsx",
			"**/*.config.ts",
			"**/*.gen.ts",
			"src/constant/server.ts",
		],
	},
	...oxlint.buildFromOxlintConfigFile("./.oxlintrc.json"),
]
