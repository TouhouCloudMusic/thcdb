import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound } from "@tanstack/solid-router"
import { CorrectionQueryOption, ReleaseQueryOption } from "@thc/query"
import { Option as O } from "effect"
import { Show } from "solid-js"

import { EntityId_fromStr } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import { EntityCorrectionListPage } from "~/view/correction/EntityCorrectionListPage"

export const Route = createFileRoute("/release/$id_/corrections")({
	component: RouteComponent,
	loader: async ({ params }) => {
		const parsedId = EntityId_fromStr(params.id)
		const data = await QUERY_CLIENT.ensureQueryData(
			ReleaseQueryOption.findById(parsedId),
		)
		if (O.isNone(data)) {
			throw notFound()
		}

		await QUERY_CLIENT.ensureQueryData(
			CorrectionQueryOption.history("release", parsedId),
		)

		return data
	},
})

function RouteComponent() {
	const params = Route.useParams()
	const releaseId = EntityId_fromStr(params().id)
	const query = useQuery(() => ReleaseQueryOption.findById(releaseId))

	return (
		<Show when={query.data && O.getOrUndefined(query.data)}>
			{(release) => (
				<EntityCorrectionListPage
					entityType="release"
					entityId={release().id}
					entityName={release().title}
				/>
			)}
		</Show>
	)
}
