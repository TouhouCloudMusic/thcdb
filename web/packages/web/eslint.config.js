import eslint from "@eslint/js"
import eslintConfigPrettier from "eslint-config-prettier"
import jsxA11y from "eslint-plugin-jsx-a11y"
import solid from "eslint-plugin-solid"
import globals from "globals"
import tslint from "typescript-eslint"

const typeScriptRules = {
	"@typescript-eslint/array-type": "off",
	"@typescript-eslint/ban-ts-comment": "off",
	"@typescript-eslint/consistent-type-definitions": "off",
	"@typescript-eslint/no-confusing-void-expression": "off",
	"@typescript-eslint/no-empty-interface": "off",
	"@typescript-eslint/no-misused-promises": [
		"error",
		{
			checksVoidReturn: {
				attributes: false,
			},
		},
	],
	"@typescript-eslint/no-non-null-assertion": "off",
	"@typescript-eslint/no-unused-vars": "warn",
	"@typescript-eslint/only-throw-error": "off",
	"@typescript-eslint/restrict-plus-operands": [
		"error",
		{ allowNumberAndString: true },
	],
	"@typescript-eslint/restrict-template-expressions": [
		"error",
		{ allowNumber: true },
	],
}
/**
 * @type {import('eslint').Linter.FlatConfig[]}
 */
export default [
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
			parserOptions: {
				project: ["./tsconfig.json"],
			},
		},
	},
	eslint.configs.recommended,
	eslintConfigPrettier,
	...tslint.configs.strictTypeChecked,
	...tslint.configs.stylisticTypeChecked,
	// typescript
	{
		files: ["src/**/*.ts"],
		rules: typeScriptRules,
	},
	// jsx
	{
		files: ["src/**/*.tsx"],
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		...jsxA11y.flatConfigs.recommended,
		...solid.configs["flat/typescript"],
		rules: {
			...typeScriptRules,
			"solid/self-closing-comp": [
				"warn",
				{
					// which Solid components should be self-closing when possible
					component: "all", // "all" | "none"
					// which native elements should be self-closing when possible
					html: "void", // "all" | "void" | "none"
				},
			],
			"solid/prefer-for": "off",
			"solid/components-return-once": ["error"],
			/**
			 * 暂不支持solid jsx
			 * https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/issues/894
			 * https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/pull/977
			 * */
			"jsx-a11y/label-has-associated-control": "off",
		},
	},
	{
		ignores: [".cz-config.cjs", ".output/", ".vinxi/"],
	},
]
