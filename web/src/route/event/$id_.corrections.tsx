import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound } from "@tanstack/solid-router"
import { CorrectionQueryOption, EventQueryOption } from "@thc/query"
import { Option as O } from "effect"
import { Show } from "solid-js"

import { loadEntityId } from "~/route/-entityId"
import { QUERY_CLIENT } from "~/state/tanstack"
import { EntityCorrectionListPage } from "~/view/correction/EntityCorrectionListPage"

export const Route = createFileRoute("/event/$id_/corrections")({
	component: RouteComponent,
	beforeLoad: loadEntityId,
	loader: async ({ context: { entityId: parsedId } }) => {
		const data = await QUERY_CLIENT.ensureQueryData(
			EventQueryOption.findById(parsedId),
		)
		if (O.isNone(data)) {
			throw notFound()
		}

		await QUERY_CLIENT.ensureQueryData(
			CorrectionQueryOption.history("event", parsedId),
		)

		return data
	},
})

function RouteComponent() {
	const { entityId: eventId } = Route.useRouteContext()()
	const query = useQuery(() => EventQueryOption.findById(eventId))

	return (
		<Show when={query.data && O.getOrUndefined(query.data)}>
			{(event) => (
				<EntityCorrectionListPage
					entityType="event"
					entityId={event().id}
					entityName={event().name}
				/>
			)}
		</Show>
	)
}
