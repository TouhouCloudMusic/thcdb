import { createFileRoute } from "@tanstack/solid-router"

import { AuthGuard } from "~/component/route"
import { EditSongPage } from "~/view/song/edit"

export const Route = createFileRoute("/song/new")({
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<AuthGuard>
			<EditSongPage type="new" />
		</AuthGuard>
	)
}
