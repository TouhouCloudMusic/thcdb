import type { StorybookConfig } from "storybook-solidjs-vite"
import { mergeConfig } from "vite"

const config: StorybookConfig = {
	framework: "storybook-solidjs-vite",
	stories: ["../src/components/**/*.stories.@(ts|tsx)"],
	addons: [
		"@storybook/addon-onboarding",
		"@storybook/addon-docs",
		"@storybook/addon-a11y",
		"@storybook/addon-links",
		{
			name: "@storybook/addon-vitest",
			options: {
				cli: false,
			},
		},
	],
	// oxlint-disable-next-line require-await
	async viteFinal(config) {
		return mergeConfig(config, {
			define: {
				"process.env": {},
			},
		})
	},
	docs: {
		autodocs: true,
	},
	typescript: {
		reactDocgen: "react-docgen-typescript",
		reactDocgenTypescriptOptions: {
			shouldExtractLiteralValuesFromEnum: true,
			propFilter: (prop) =>
				prop.parent ? !/node_modules/.test(prop.parent.fileName) : true,
		},
	},
}

// oxlint-disable-next-line no-default-export
export default config
