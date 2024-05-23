/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import globals from "globals"
import pluginJs from "@eslint/js"
import tseslint from "typescript-eslint"
import solid from "eslint-plugin-solid/configs/typescript.js"
import eslintConfigPrettier from "eslint-config-prettier"
export default [
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
			parserOptions: { project: true },
		},
	},
	pluginJs.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	solid,
	eslintConfigPrettier,
	{
		rules: {
			"@typescript-eslint/no-unused-vars": "warn",
			"@typescript-eslint/array-type": "off",
			"solid/self-closing-comp": [
				"warn",
				{
					// which Solid components should be self-closing when possible
					component: "all", // "all" | "none"
					// which native elements should be self-closing when possible
					html: "void", // "all" | "void" | "none"
				},
			],
		},
	},
	{
		ignores: [".cz-config.cjs", ".output/", ".vinxi/"],
	},
]
