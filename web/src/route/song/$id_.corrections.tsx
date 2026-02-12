import { useQuery } from "@tanstack/solid-query"
import { createFileRoute } from "@tanstack/solid-router"
import { CorrectionQueryOption, SongQueryOption } from "@thc/query"

import { EntityId_fromStr } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import { EntityCorrectionListPage } from "~/view/correction/EntityCorrectionListPage"

export const Route = createFileRoute("/song/$id_/corrections")({
	component: RouteComponent,
	loader: async ({ params }) => {
		const parsedId = EntityId_fromStr(params.id)
		await QUERY_CLIENT.ensureQueryData(SongQueryOption.findById(parsedId))
		await QUERY_CLIENT.ensureQueryData(
			CorrectionQueryOption.history("song", parsedId),
		)
	},
})

function RouteComponent() {
	const params = Route.useParams()
	const songId = EntityId_fromStr(params().id)
	const query = useQuery(() => SongQueryOption.findById(songId))

	return (
		<EntityCorrectionListPage
			entityType="song"
			entityId={songId}
			entityName={query.data?.title ?? `Song #${songId}`}
		/>
	)
}
