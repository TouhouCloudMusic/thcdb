import { createFileRoute } from "@tanstack/solid-router"

import { AuthGuard } from "~/component/route"
import { languageListQueryOptions } from "~/state/language"
import { QUERY_CLIENT } from "~/state/tanstack"
import { EditLabelPage } from "~/view/label/edit"

export const Route = createFileRoute("/label/new")({
	component: RouteComponent,
	loader: () => {
		void QUERY_CLIENT.prefetchQuery(languageListQueryOptions())
	},
})

function RouteComponent() {
	return (
		<AuthGuard>
			<EditLabelPage type="new" />
		</AuthGuard>
	)
}
