import extractor from "@lingui-solid/babel-plugin-extract-messages/extractor"
import { defineConfig } from "@lingui/cli"

// oxlint-disable-next-line no-default-export
export default {
	sourceLocale: "en",
	locales: ["zh-Hans", "en"],
	catalogs: [
		{
			path: "<rootDir>/src/locale/{locale}/messages",
			include: ["src"],
		},
	],
	runtimeConfigModule: {
		Trans: ["@lingui-solid/solid", "Trans"],
		useLingui: ["@lingui-solid/solid", "useLingui"],
	},
	extractors: [extractor],
}
