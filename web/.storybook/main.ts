import { defineMain } from "storybook-solidjs-vite"

export default defineMain({
	framework: {
		name: "storybook-solidjs-vite",
		options: {
			// docgen: {
			// Enabled by default, but you can configure or disable it:
			//  see https://github.com/styleguidist/react-docgen-typescript#options
			// },
		},
	},
	core: {
		builder: "@storybook/builder-vite",
	},
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
	async viteFinal(config) {
		const { mergeConfig } = await import("vite")
		return mergeConfig(config, {
			optimizeDeps: {
				include: ["storybook-dark-mode"],
			},
			define: {
				"process.env": {},
			},
		})
	},
	stories: ["../src/component/!(__legacy|dialog)/**/*.stories.@(ts|tsx)"],
})
