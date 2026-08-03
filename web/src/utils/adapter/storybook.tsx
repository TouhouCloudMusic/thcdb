import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterContextProvider,
} from "@tanstack/solid-router"
import { createJSXDecorator } from "storybook-solidjs-vite"

export { withStoryI18N, withStoryState } from "~/utils/adapter/storybook-state"

export const enum StoryLayout {
	Centered = "centered",
	FullScreen = "fullscreen",
	Padded = "padded",
}

type StoryRouterParameters = {
	tanstackRouter?: {
		initialEntry?: string
	}
}

export function createStoryRouter(initialEntries = ["/"]) {
	return createRouter({
		routeTree: createRootRoute(),
		history: createMemoryHistory({
			initialEntries,
		}),
	})
}

export const withStoryRouter = createJSXDecorator((Story, context) => {
	const initialEntry =
		(context.parameters as StoryRouterParameters).tanstackRouter?.initialEntry
		?? "/"
	const router = createStoryRouter([initialEntry])

	return (
		<RouterContextProvider router={router}>
			{() => <Story />}
		</RouterContextProvider>
	)
})
