import { useQuery } from "@tanstack/solid-query"
import { createFileRoute } from "@tanstack/solid-router"
import { CorrectionQueryOption, SongQueryOption } from "@thc/query"

import { loadEntityId } from "~/route/-entityId"
import { QUERY_CLIENT } from "~/state/tanstack"
import { EntityCorrectionListPage } from "~/view/correction/EntityCorrectionListPage"

export const Route = createFileRoute("/song/$id_/corrections")({
	component: RouteComponent,
	beforeLoad: loadEntityId,
	loader: async ({ context: { entityId: parsedId } }) => {
		await QUERY_CLIENT.ensureQueryData(SongQueryOption.findById(parsedId))
		await QUERY_CLIENT.ensureQueryData(
			CorrectionQueryOption.history("song", parsedId),
		)
	},
})

function RouteComponent() {
	const { entityId: songId } = Route.useRouteContext()()
	const query = useQuery(() => SongQueryOption.findById(songId))

	return (
		<EntityCorrectionListPage
			entityType="song"
			entityId={songId}
			entityName={query.data?.title ?? `Song #${songId}`}
		/>
	)
}
