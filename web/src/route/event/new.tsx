import { createFileRoute } from "@tanstack/solid-router"

import { EditEventPage } from "~/view/event/edit"

export const Route = createFileRoute("/event/new")({
	component: RouteComponent,
})

function RouteComponent() {
	return <EditEventPage type="new" />
}
