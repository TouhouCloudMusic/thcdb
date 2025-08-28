import type { Preview } from "storybook-solidjs"

// oxlint-disable-next-line no-unassigned-import
import "../src/index.css"

const preview: Preview = {
	tags: ["autodocs"],
	parameters: {
		actions: { argTypesRegex: "^on.*" },
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		docs: {
			codePanel: true,
		},
	},
}

// oxlint-disable-next-line no-default-export
export default preview
