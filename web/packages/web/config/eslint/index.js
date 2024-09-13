import JsxA11y from "eslint-plugin-jsx-a11y"
import Solid from "eslint-plugin-solid"

/**
 * @type {import("eslint").Linter.RulesRecord}
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
	"@typescript-eslint/no-empty-object-type": [
		"warn",
		{
			allowInterfaces: "with-single-extends",
		},
	],
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
 * @type {import("eslint").Linter.Config}
 */
export const tsConfig = {
	files: ["config/**/*.ts", "src/**/*.ts", "test/**/*.ts"],
	rules: tsRules,
}

/**
 * @type {import("eslint").Linter.Config[]}
 */
export const tsxConfigArray = [
	// solid
	{
		files: ["src/**/*.tsx"],
		...Solid.configs["flat/typescript"],
		rules: {
			...Solid.configs["flat/typescript"].rules,
			"solid/self-closing-comp": [
				"warn",
				{
					component: "all",
					html: "void",
				},
			],
			"solid/prefer-for": "off",
		},
	},
	// a11y
	{
		files: ["src/**/*.tsx"],
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		...JsxA11y.flatConfigs.strict,
	},
	// typescript
	{
		files: ["src/**/*.tsx"],
		rules: {
			...tsRules,
		},
	},
]
