import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/solid-router"
import type { UserProfile } from "@thc/api"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import type { PageResponseUserSummary } from "~/hey-api"
import { Route } from "~/route/admin/users"
import { withStoryApi } from "~/storybook/api"
import { StoryLayout } from "~/utils/adapter/storybook"
import { withStoryState } from "~/utils/adapter/storybook-state"

import { AdminUsersPage } from "./users"

const PROFILE: UserProfile = {
	id: 1,
	name: "Hakurei Reimu",
	last_login: "2026-10-04T09:30:00Z",
	roles: [{ id: 1, name: "Admin" }],
	permissions: ["admin.user.read", "admin.user.role.write"],
	stats: { edit_count: 152, vote_count: 57 },
}
const USERS: PageResponseUserSummary = {
	items: [
		{ id: 1, name: "Hakurei Reimu", roles: [{ id: 1, name: "Admin" }] },
		{ id: 2, name: "Kirisame Marisa", roles: [{ id: 2, name: "Moderator" }] },
		{ id: 3, name: "Patchouli Knowledge", roles: [] },
	],
	page: 1,
	page_size: 20,
	total_items: 3,
	total_pages: 1,
}

function StoryRoot() {
	const root = createRootRoute()
	const page = createRoute({
		getParentRoute: () => root,
		path: "/admin/users",
		component: AdminUsersPage,
		validateSearch: Route.options.validateSearch,
	})
	const router = createRouter({
		routeTree: root.addChildren([page]),
		history: createMemoryHistory({ initialEntries: ["/admin/users"] }),
	})
	return <RouterProvider router={router} />
}

const meta = {
	title: "View/Admin/Users",
	component: StoryRoot,
	decorators: [
		withStoryState,
		withStoryApi({
			"/api/profile": Response.json({ status: "Ok", data: PROFILE }),
			"/api/admin/users": Response.json({ status: "Ok", data: USERS }),
			"/api/editable-user-roles": Response.json({
				status: "Ok",
				data: ["Moderator"],
			}),
			"/api/admin/user/2/roles": Response.json({
				status: "Ok",
				message: "Roles updated",
			}),
			"/api/admin/user/3/roles": Response.json({
				status: "Ok",
				message: "Roles updated",
			}),
		}),
	],
	parameters: { layout: StoryLayout.FullScreen },
} satisfies Meta<typeof StoryRoot>

export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
