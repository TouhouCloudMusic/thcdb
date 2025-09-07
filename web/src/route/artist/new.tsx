import { createFileRoute } from "@tanstack/solid-router"

import { EditArtistPage } from "~/view/artist/edit"

export const Route = createFileRoute("/artist/new")({
	component: RouteComponent,
})

function RouteComponent() {
	return <EditArtistPage type="new" />
}
