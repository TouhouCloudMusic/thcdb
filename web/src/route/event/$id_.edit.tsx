import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound, useNavigate } from "@tanstack/solid-router"
import { EventQueryOption } from "@thc/query"
import { Option as O } from "effect"
import { createEffect, Show } from "solid-js"

import { AuthGuard } from "~/component/route"
import { EntityId_fromStr } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import { EditEventPage } from "~/view/event/edit"

export const Route = createFileRoute("/event/$id_/edit")({
	component: RouteComponent,
	loader: async ({ params: { id } }) => {
		const parsedId = EntityId_fromStr(id)

		const data = await QUERY_CLIENT.ensureQueryData(
			EventQueryOption.findById(parsedId),
		)
		if (O.isNone(data)) {
			throw notFound()
		}
		return data
	},
})

function RouteComponent() {
	const params = Route.useParams()
	const id = params().id
	const parsedId = EntityId_fromStr(id)
	const query = useQuery(() => EventQueryOption.findById(parsedId))

	const nav = useNavigate()
	createEffect(() => {
		if (query.isError) {
			void nav({ to: "/" })
		}
	})

	return (
		<AuthGuard>
			<Show when={query.data}>
				{(eventOption) => (
					<EditEventPage
						type="edit"
						event={O.getOrThrow(eventOption())}
					/>
				)}
			</Show>
		</AuthGuard>
	)
}
