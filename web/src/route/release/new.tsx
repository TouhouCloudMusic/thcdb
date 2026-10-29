import { createFileRoute } from "@tanstack/solid-router"

import { AuthGuard } from "~/component/route"
import { languageListQueryOptions } from "~/state/language"
import { QUERY_CLIENT } from "~/state/tanstack"
import { EditReleasePage } from "~/view/release/edit"

export const Route = createFileRoute("/release/new")({
	component: RouteComponent,
	loader: () => {
		void QUERY_CLIENT.prefetchQuery(languageListQueryOptions())
	},
})

function RouteComponent() {
	return (
		<AuthGuard>
			<EditReleasePage type="new" />
		</AuthGuard>
	)
}
