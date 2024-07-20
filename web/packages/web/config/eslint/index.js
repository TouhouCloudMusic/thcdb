import JsxA11y from "eslint-plugin-jsx-a11y"
import Solid from "eslint-plugin-solid"

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

export const tsConfig = {
	files: ["src/**/*.ts"],
	rules: {
		...tsRules,
	},
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
export const tsxConfig = {
	files: ["src/**/*.tsx"],
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	...JsxA11y.flatConfigs.recommended,
	...Solid.configs["flat/typescript"],
	rules: {
		...tsRules,
		"solid/self-closing-comp": [
			"warn",
			{
				component: "all",
				html: "void",
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
}
