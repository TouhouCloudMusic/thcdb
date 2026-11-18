import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound } from "@tanstack/solid-router"
import { CorrectionQueryOption, ReleaseQueryOption } from "@thc/query"
import { Option as O } from "effect"
import { Show } from "solid-js"

import { loadEntityId } from "~/route/-entityId"
import { QUERY_CLIENT } from "~/state/tanstack"
import { EntityCorrectionListPage } from "~/view/correction/EntityCorrectionListPage"

export const Route = createFileRoute("/release/$id_/corrections")({
	component: RouteComponent,
	beforeLoad: loadEntityId,
	loader: async ({ context: { entityId: parsedId } }) => {
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
	const { entityId: releaseId } = Route.useRouteContext()()
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
