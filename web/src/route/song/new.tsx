import { createFileRoute } from "@tanstack/solid-router"

import { EditSongPage } from "~/view/song/edit"

export const Route = createFileRoute("/song/new")({
	component: RouteComponent,
})

function RouteComponent() {
	return <EditSongPage type="new" />
}
