import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound } from "@tanstack/solid-router"
import { EventQueryOption } from "@thc/query"
import { Option as O } from "effect"
import { Show } from "solid-js"

import { EntityId_fromStr } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import { EventInfoPage } from "~/view/event/Info"

export const Route = createFileRoute("/event/$id")({
	component: RouteComponent,
	loader: async ({ params }) => {
		const parsedId = EntityId_fromStr(params.id)
		const data = await QUERY_CLIENT.ensureQueryData(
			EventQueryOption.findById(parsedId),
		)
		if (O.isNone(data)) {
			throw notFound()
		}
	},
})

function RouteComponent() {
	const params = Route.useParams()
	const eventId = EntityId_fromStr(params().id)
	const query = useQuery(() => EventQueryOption.findById(eventId))

	return (
		<Show when={query.isSuccess && O.getOrUndefined(query.data)}>
			{(event) => <EventInfoPage event={event()} />}
		</Show>
	)
}
