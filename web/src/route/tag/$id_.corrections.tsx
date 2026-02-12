import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound } from "@tanstack/solid-router"
import { CorrectionQueryOption, TagQueryOption } from "@thc/query"
import { Option as O } from "effect"
import { Show } from "solid-js"

import { EntityId_fromStr } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import { EntityCorrectionListPage } from "~/view/correction/EntityCorrectionListPage"

export const Route = createFileRoute("/tag/$id_/corrections")({
	component: RouteComponent,
	loader: async ({ params }) => {
		const parsedId = EntityId_fromStr(params.id)
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
	const params = Route.useParams()
	const tagId = EntityId_fromStr(params().id)
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
