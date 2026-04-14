import { createBabelExtractor } from "@lingui/cli/api/extractors/babel"
import { formatter } from "@lingui/format-po"
import { defineConfig } from "@lingui/solid/config"

export default defineConfig({
	locales: ["en", "zh-CN"],
	sourceLocale: "en",
	format: formatter({
		lineNumbers: false,
		origins: true,
	}),
	catalogs: [
		{
			path: "src/locales/{locale}",
			include: ["src"],
			exclude: [
				"**/*.gen.ts",
				"**/*.test.ts",
				"**/*.test.tsx",
				"**/*.stories.ts",
				"**/*.stories.tsx",
				"src/hey-api/**",
			],
		},
	],
	extractors: [createBabelExtractor()],
	runtimeConfigModule: {
		i18n: ["~/state/i18n/runtime", "i18n"],
		useLingui: ["~/state/i18n/runtime", "useLingui"],
		Trans: ["~/state/i18n/runtime", "Trans"],
	},
})
