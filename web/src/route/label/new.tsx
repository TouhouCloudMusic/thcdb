import { createFileRoute } from "@tanstack/solid-router"

import { AuthGuard } from "~/component/route"
import { EditLabelPage } from "~/view/label/edit"

export const Route = createFileRoute("/label/new")({
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<AuthGuard>
			<EditLabelPage type="new" />
		</AuthGuard>
	)
}
