import { createFileRoute } from "@tanstack/solid-router"
import * as v from "valibot"

import { AdminGuard } from "~/component/route"
import { AdminUsersPage } from "~/view/admin/users"

const DEFAULT_LIMIT = 20

const adminUsersSearch = v.object({
	page: v.fallback(v.pipe(v.number(), v.minValue(1)), 1),
	limit: v.fallback(v.pipe(v.number(), v.minValue(1)), DEFAULT_LIMIT),
	keyword: v.optional(v.string()),
})

export const Route = createFileRoute("/admin/users")({
	component: RouteComponent,
	validateSearch: adminUsersSearch,
})

function RouteComponent() {
	return (
		<AdminGuard>
			<AdminUsersPage />
		</AdminGuard>
	)
}
