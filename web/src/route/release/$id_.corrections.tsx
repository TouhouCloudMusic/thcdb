import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound } from "@tanstack/solid-router"
import { CorrectionQueryOption } from "@thc/query"
import { Show } from "solid-js"

import { findReleaseByIdOptions } from "~/hey-api/@tanstack/solid-query.gen"
import { loadEntityId } from "~/route/-entityId"
import { QUERY_CLIENT } from "~/state/tanstack"
import { EntityCorrectionListPage } from "~/view/correction/EntityCorrectionListPage"

export const Route = createFileRoute("/release/$id_/corrections")({
	component: RouteComponent,
	beforeLoad: loadEntityId,
	loader: async ({ context: { entityId: parsedId } }) => {
		const { data } = await QUERY_CLIENT.ensureQueryData(
			findReleaseByIdOptions({ path: { id: parsedId } }),
		)
		if (data === null) {
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
	const query = useQuery(() => ({
		...findReleaseByIdOptions({ path: { id: releaseId } }),
		throwOnError: true,
	}))

	return (
		<Show when={query.data?.data}>
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
