import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/solid-router"
import type { SongLyrics } from "@thc/api"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { Route } from "~/route/song-lyrics/$id"
import { withStoryApi } from "~/storybook/api"
import { StoryLayout } from "~/utils/adapter/storybook"
import { withStoryState } from "~/utils/adapter/storybook-state"

const LYRICS: SongLyrics = {
	id: 42,
	song_id: 42,
	is_main: true,
	language: { id: 1, code: "ja", name: "Japanese" },
	content:
		"月明かりを追い越して\n遠い幻想の向こうへ\n重なる鼓動を聴きながら\n夜明けまで踊り続ける",
}

function StoryRoot() {
	const root = createRootRoute()
	const page = createRoute({
		getParentRoute: () => root,
		path: "/song-lyrics/$id",
		component: Route.options.component,
	})
	const router = createRouter({
		routeTree: root.addChildren([page]),
		history: createMemoryHistory({ initialEntries: ["/song-lyrics/42"] }),
	})
	return <RouterProvider router={router} />
}

const meta = {
	title: "View/Song/Lyrics",
	component: StoryRoot,
	decorators: [
		withStoryState,
		withStoryApi({
			"/api/profile": Response.json(
				{ status: "Unauthorized" },
				{ status: 401 },
			),
			"/api/song-lyrics/42": Response.json({ status: "Ok", data: LYRICS }),
		}),
	],
	parameters: { layout: StoryLayout.FullScreen },
} satisfies Meta<typeof StoryRoot>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
