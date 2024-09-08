/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import JsxA11y from "eslint-plugin-jsx-a11y"
import Solid from "eslint-plugin-solid"

/**
 * @type {import("eslint").Linter.FlatConfig["rules"]}
 */
export const tsRules = {
	"@typescript-eslint/array-type": "off",
	"@typescript-eslint/ban-ts-comment": "off",
	"@typescript-eslint/consistent-type-definitions": "off",
	"@typescript-eslint/consistent-type-imports": [
		"warn",
		{
			fixStyle: "inline-type-imports",
			prefer: "type-imports",
		},
	],
	"@typescript-eslint/no-confusing-void-expression": "off",
	"@typescript-eslint/no-empty-interface": "off",
	"@typescript-eslint/no-empty-object-type": {
		allowInterfaces: "with-single-extends",
	},
	"@typescript-eslint/no-misused-promises": [
		"error",
		{
			checksVoidReturn: {
				attributes: false,
			},
		},
	],
	"@typescript-eslint/no-non-null-assertion": "off",
	"@typescript-eslint/no-unused-vars": [
		"warn",
		{
			args: "all",
			argsIgnorePattern: "^_",
			caughtErrors: "all",
			caughtErrorsIgnorePattern: "^_",
			destructuredArrayIgnorePattern: "^_",
			varsIgnorePattern: "^_",
			ignoreRestSiblings: true,
		},
	],
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
 * @type {import("eslint").Linter.FlatConfig}
 */
export const tsConfig = {
	files: ["config/**/*.ts", "src/**/*.ts", "test/**/*.ts"],
	rules: tsRules,
}

/**
 * @type {import("eslint").Linter.FlatConfig}
 */
export const tsxConfigArray = [
	// solid
	{
		files: ["src/**/*.tsx"],
		...Solid.configs["flat/typescript"],
		rules: {
			"solid/self-closing-comp": [
				"warn",
				{
					component: "all",
					html: "void",
				},
			],
			"solid/prefer-for": "off",
			"solid/components-return-once": ["error"],
		},
	},
	// a11y
	{
		files: ["src/**/*.tsx"],
		...JsxA11y.flatConfigs.recommended,
		rules: {
			/**
			 * 暂不支持solid jsx
			 * https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/issues/894
			 * https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/pull/977
			 * */
			"jsx-a11y/label-has-associated-control": "off",
		},
	},
	// typescript
	{
		files: ["src/**/*.tsx"],
		rules: {
			...tsRules,
		},
	},
]
