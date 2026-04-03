import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound } from "@tanstack/solid-router"
import { CorrectionQueryOption, ReleaseQueryOption } from "@thc/query"
import { Option as O } from "effect"
import { Show } from "solid-js"

import { EntityId_fromStr } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import { ReleaseInfoPage } from "~/view/release/Info"

export const Route = createFileRoute("/release/$id")({
	component: RouteComponent,
	loader: async ({ params }) => {
		const parsedId = EntityId_fromStr(params.id)
		const [data] = await Promise.all([
			QUERY_CLIENT.ensureQueryData(ReleaseQueryOption.findById(parsedId)),
			QUERY_CLIENT.ensureQueryData(
				CorrectionQueryOption.history("release", parsedId),
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
	const releaseId = EntityId_fromStr(params().id)
	const query = useQuery(() => ReleaseQueryOption.findById(releaseId))
	const correctionHistoryQuery = useQuery(() =>
		CorrectionQueryOption.history("release", releaseId),
	)

	return (
		<Show when={query.data && O.getOrUndefined(query.data)}>
			{(release) => (
				<ReleaseInfoPage
					release={release()}
					correctionHistory={correctionHistoryQuery.data ?? []}
				/>
			)}
		</Show>
	)
}
