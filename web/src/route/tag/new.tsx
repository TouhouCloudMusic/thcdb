import { createFileRoute } from "@tanstack/solid-router"

import { AuthGuard } from "~/component/route"
import { EditTagPage } from "~/view/tag/edit"

export const Route = createFileRoute("/tag/new")({
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<AuthGuard>
			<EditTagPage type="new" />
		</AuthGuard>
	)
}
