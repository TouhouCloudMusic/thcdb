import { QueryClient } from "@tanstack/solid-query"
import {
	createMemoryHistory,
	createRouter,
	RouterContextProvider,
} from "@tanstack/solid-router"
import { createJSXDecorator } from "storybook-solidjs-vite"

import { routeTree } from "~/routeTree.gen"
import { I18NProvider } from "~/state/i18n"

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

function createStoryQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				staleTime: Number.POSITIVE_INFINITY,
			},
			mutations: {
				retry: false,
			},
		},
	})
}

function createStoryRouter(initialEntries = ["/"]) {
	return createRouter({
		routeTree,
		history: createMemoryHistory({
			initialEntries,
		}),
		context: {
			queryClient: createStoryQueryClient(),
		},
		defaultPreloadStaleTime: 0,
	})
}

export const withStoryI18N = createJSXDecorator((Story) => (
	<I18NProvider initialLocale="en">
		<Story />
	</I18NProvider>
))

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
