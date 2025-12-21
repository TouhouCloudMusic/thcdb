import { createFileRoute } from "@tanstack/solid-router"

import { LabelListPage } from "~/view/label/List"

export const Route = createFileRoute("/label/")({
	component: RouteComponent,
})

function RouteComponent() {
	return <LabelListPage />
}
