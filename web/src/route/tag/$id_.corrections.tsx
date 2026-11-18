import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound } from "@tanstack/solid-router"
import { CorrectionQueryOption, TagQueryOption } from "@thc/query"
import { Option as O } from "effect"
import { Show } from "solid-js"

import { loadEntityId } from "~/route/-entityId"
import { QUERY_CLIENT } from "~/state/tanstack"
import { EntityCorrectionListPage } from "~/view/correction/EntityCorrectionListPage"

export const Route = createFileRoute("/tag/$id_/corrections")({
	component: RouteComponent,
	beforeLoad: loadEntityId,
	loader: async ({ context: { entityId: parsedId } }) => {
		const data = await QUERY_CLIENT.ensureQueryData(
			TagQueryOption.findById(parsedId),
		)
		if (O.isNone(data)) {
			throw notFound()
		}

		await QUERY_CLIENT.ensureQueryData(
			CorrectionQueryOption.history("tag", parsedId),
		)

		return data
	},
})

function RouteComponent() {
	const { entityId: tagId } = Route.useRouteContext()()
	const query = useQuery(() => TagQueryOption.findById(tagId))

	return (
		<Show when={query.data && O.getOrUndefined(query.data)}>
			{(tag) => (
				<EntityCorrectionListPage
					entityType="tag"
					entityId={tag().id}
					entityName={tag().name}
				/>
			)}
		</Show>
	)
}
