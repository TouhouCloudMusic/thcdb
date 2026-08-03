import { createJSXDecorator } from "storybook-solidjs-vite"

import { StateProvider } from "~/state"
import { I18NProvider } from "~/state/i18n"

export const withStoryI18N = createJSXDecorator((Story) => (
	<I18NProvider initialLocale="en">
		<Story />
	</I18NProvider>
))

export const withStoryState = createJSXDecorator((Story) => (
	<StateProvider initialLocale="en">
		<Story />
	</StateProvider>
))
