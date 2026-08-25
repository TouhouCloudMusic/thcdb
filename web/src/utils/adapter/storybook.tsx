import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterContextProvider,
} from "@tanstack/solid-router"
import type { ParentProps } from "solid-js"
import { createJSXDecorator } from "storybook-solidjs-vite"

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

export function StoryRouterProvider(
	props: ParentProps<{ initialEntry?: string }>,
) {
	const router = createRouter({
		routeTree: createRootRoute(),
		history: createMemoryHistory({
			initialEntries: [props.initialEntry ?? "/"],
		}),
	})

	return (
		<RouterContextProvider router={router}>
			{() => props.children}
		</RouterContextProvider>
	)
}

export const withStoryRouter = createJSXDecorator((Story, context) => {
	const initialEntry =
		(context.parameters as StoryRouterParameters).tanstackRouter?.initialEntry
		?? "/"

	return (
		<StoryRouterProvider initialEntry={initialEntry}>
			<Story />
		</StoryRouterProvider>
	)
})
