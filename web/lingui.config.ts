import extractor from "@lingui-solid/babel-plugin-extract-messages/extractor"
import { defineConfig } from "@lingui/cli"

// oxlint-disable-next-line no-default-export
export default defineConfig({
	sourceLocale: "en",
	locales: ["zh-Hans", "en"],
	catalogs: [
		{
			path: "<rootDir>/src/locale/{locale}/messages",
			include: ["<rootDir>/src"],
			exclude: ["**/*.test.*", "**/*.stories.*", "src/assets"],
		},
	],
	runtimeConfigModule: {
		Trans: ["@lingui-solid/solid", "Trans"],
		useLingui: ["@lingui-solid/solid", "useLingui"],
	},
	extractors: [extractor],
})
