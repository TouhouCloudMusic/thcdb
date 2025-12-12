import { createFileRoute } from "@tanstack/solid-router"

import { EditLabelPage } from "~/view/label/edit"

export const Route = createFileRoute("/label/new")({
	component: RouteComponent,
})

function RouteComponent() {
	return <EditLabelPage type="new" />
}
