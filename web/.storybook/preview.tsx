import addonA11y from "@storybook/addon-a11y"
import addonDocs from "@storybook/addon-docs"
import { createJSXDecorator, definePreview } from "storybook-solidjs-vite"

import "../src/index.css"
import { I18NProvider } from "../src/state/i18n"
import { loadLocale } from "../src/state/i18n/runtime"

await loadLocale("en")

export default definePreview({
	addons: [addonDocs(), addonA11y()],
	decorators: [
		createJSXDecorator((Story) => (
			<I18NProvider initialLocale="en">
				<Story />
			</I18NProvider>
		)),
	],
	parameters: {
		// automatically create action args for all props that start with 'on'
		actions: {
			argTypesRegex: "^on.*",
		},
		backgrounds: {
			options: {
				studio: { name: "Studio", value: "#edf2f7" },
				paper: { name: "Paper", value: "#f7f4ec" },
				ink: { name: "Ink", value: "#0f172a" },
			},
		},
		controls: {
			disableSaveFromUI: true,
			matchers: {
				color: /(background|color)$/iu,
				date: /Date$/iu,
			},
		},
		a11y: {
			// 'todo' - show a11y violations in the test UI only
			// 'error' - fail CI on a11y violations
			// 'off' - skip a11y checks entirely
			test: "todo",
		},
	},
	// All components will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
	// tags: ['autodocs'],
})
