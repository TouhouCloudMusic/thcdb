import {
	createMemoryHistory,
	createRouter,
	RouterContextProvider,
} from "@tanstack/solid-router"
import type { ParentProps } from "solid-js"
import { createJSXDecorator } from "storybook-solidjs-vite"

import { routeTree } from "~/routeTree.gen"
import { useCurrentUser } from "~/state/user"

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

export function StoryRouterProvider(
	props: ParentProps<{ initialEntry?: string }>,
) {
	const router = createRouter({
		routeTree,
		history: createMemoryHistory({
			initialEntries: [props.initialEntry ?? "/"],
		}),
		context: {
			currentUser: useCurrentUser(),
		},
		defaultPreloadStaleTime: 0,
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
