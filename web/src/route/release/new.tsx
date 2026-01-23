import { createFileRoute } from "@tanstack/solid-router"

import { AuthGuard } from "~/component/route"
import { EditReleasePage } from "~/view/release/edit"

export const Route = createFileRoute("/release/new")({
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<AuthGuard>
			<EditReleasePage type="new" />
		</AuthGuard>
	)
}
