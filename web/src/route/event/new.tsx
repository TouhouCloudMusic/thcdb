import { createFileRoute } from "@tanstack/solid-router"

import { AuthGuard } from "~/component/route"
import { EditEventPage } from "~/view/event/edit"

export const Route = createFileRoute("/event/new")({
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<AuthGuard>
			<EditEventPage type="new" />
		</AuthGuard>
	)
}
