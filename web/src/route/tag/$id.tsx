import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound } from "@tanstack/solid-router"
import { CorrectionQueryOption, TagQueryOption } from "@thc/query"
import { Option as O } from "effect"
import { Show } from "solid-js"

import { EntityId_fromStr } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import { TagInfoPage } from "~/view/tag/Info"

export const Route = createFileRoute("/tag/$id")({
	component: RouteComponent,
	loader: async ({ params }) => {
		const parsedId = EntityId_fromStr(params.id)
		const [data] = await Promise.all([
			QUERY_CLIENT.ensureQueryData(TagQueryOption.findById(parsedId)),
			QUERY_CLIENT.ensureQueryData(
				CorrectionQueryOption.history("tag", parsedId),
			),
		])
		if (O.isNone(data)) {
			throw notFound()
		}
		return data
	},
})

function RouteComponent() {
	const params = Route.useParams()
	const tagId = EntityId_fromStr(params().id)
	const query = useQuery(() => TagQueryOption.findById(tagId))
	const correctionHistoryQuery = useQuery(() =>
		CorrectionQueryOption.history("tag", tagId),
	)

	return (
		<Show when={query.data && O.getOrThrowWith(query.data, () => notFound())}>
			{(tag) => (
				<TagInfoPage
					tag={tag()}
					correctionHistory={correctionHistoryQuery.data ?? []}
				/>
			)}
		</Show>
	)
}
