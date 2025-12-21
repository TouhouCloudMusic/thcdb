import { createFileRoute } from "@tanstack/solid-router"

import { EditReleasePage } from "~/view/release/edit"

export const Route = createFileRoute("/release/new")({
	component: RouteComponent,
})

function RouteComponent() {
	return <EditReleasePage type="new" />
}
