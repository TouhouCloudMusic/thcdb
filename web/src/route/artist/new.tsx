import { createFileRoute } from "@tanstack/solid-router"

import { AuthGuard } from "~/component/route"
import { languageListQueryOptions } from "~/state/language"
import { QUERY_CLIENT } from "~/state/tanstack"
import { EditArtistPage } from "~/view/artist/edit"

export const Route = createFileRoute("/artist/new")({
	component: RouteComponent,
	loader: () => {
		void QUERY_CLIENT.prefetchQuery(languageListQueryOptions())
	},
})

function RouteComponent() {
	return (
		<AuthGuard>
			<EditArtistPage type="new" />
		</AuthGuard>
	)
}
