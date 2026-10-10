import { createFileRoute } from "@tanstack/solid-router"

import { AuthGuard } from "~/component/route"
import { languageListQueryOptions } from "~/state/language"
import { QUERY_CLIENT } from "~/state/tanstack"
import { EditSongPage } from "~/view/song/edit"

export const Route = createFileRoute("/song/new")({
	component: RouteComponent,
	loader: () => {
		void QUERY_CLIENT.prefetchQuery(languageListQueryOptions())
	},
})

function RouteComponent() {
	return (
		<AuthGuard>
			<EditSongPage type="new" />
		</AuthGuard>
	)
}
