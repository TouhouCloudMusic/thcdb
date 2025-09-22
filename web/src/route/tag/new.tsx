import { createFileRoute } from "@tanstack/solid-router"

import { EditTagPage } from "~/view/tag/edit"

export const Route = createFileRoute("/tag/new")({
	component: RouteComponent,
})

function RouteComponent() {
	return <EditTagPage type="new" />
}
