import { createJSXDecorator } from "storybook-solidjs-vite"

import { StateProvider } from "~/state"

export const withStoryState = createJSXDecorator((Story) => (
	<StateProvider initialLocale="en">
		<Story />
	</StateProvider>
))
