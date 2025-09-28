import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound } from "@tanstack/solid-router"
import { EventQueryOption } from "@thc/query"
import { Option as O } from "effect"
import { Show } from "solid-js"
import * as v from "valibot"

import { EntityId } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import { EventInfoPage } from "~/view/event/Info"

export const Route = createFileRoute("/event/$id")({
	component: RouteComponent,
	loader: async ({ params }) => {
		const parsedId = v.parse(EntityId, Number.parseInt(params.id, 10))
		return await QUERY_CLIENT.ensureQueryData(
			EventQueryOption.findById(parsedId),
		)
	},
})

function RouteComponent() {
	const params = Route.useParams()
	const eventId = v.parse(EntityId, Number.parseInt(params().id, 10))
	const query = useQuery(() => EventQueryOption.findById(eventId))

	return (
		<Show when={query.data && O.getOrThrowWith(query.data, () => notFound())}>
			{(event) => <EventInfoPage event={event()} />}
		</Show>
	)
}
