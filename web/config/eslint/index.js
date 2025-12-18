import JsxA11y from "eslint-plugin-jsx-a11y"
import Solid from "eslint-plugin-solid"
import tslint from "typescript-eslint"

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
			fixStyle: "separate-type-imports",
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
	"@typescript-eslint/no-unsafe-assignment": "off",
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
	...tslint.configs.recommended,
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
			...reactiveRules(),
		},
	},
	// a11y
	{
		files: ["src/**/*.tsx"],
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		...JsxA11y.flatConfigs.strict,
		settings: {
			"jsx-a11y": {
				polymorphicPropName: "as",
				components: {
					CityInput: "input",
					CustomButton: "button",
					MyButton: "button",
					RoundButton: "button",
				},
				attributes: {
					for: ["htmlFor", "for"],
				},
			},
		},
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		rules: {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			...JsxA11y.flatConfigs.strict.rules,
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

function reactiveRules() {
	return {
		"solid/reactivity": [
			"error",
			{
				customReactiveFunctions: [],
			},
		],
	}
}
