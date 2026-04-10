import { useQuery } from "@tanstack/solid-query"
import { createFileRoute } from "@tanstack/solid-router"
import { CorrectionQueryOption, SongQueryOption } from "@thc/query"

import { EntityId_fromStr } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import { SongInfoPage } from "~/view/song/Info"

export const Route = createFileRoute("/song/$id")({
	component: RouteComponent,
	loader: async ({ params }) => {
		const parsedId = EntityId_fromStr(params.id)
		await Promise.all([
			QUERY_CLIENT.ensureQueryData(SongQueryOption.findById(parsedId)),
			QUERY_CLIENT.ensureQueryData(
				CorrectionQueryOption.history("song", parsedId),
			),
		])
	},

	// Optional: Add error component and pending component as in artist route if desired
	// errorComponent: () => <Navigate to="/" />,
	// pendingComponent: () => <div>Loading song...</div>,
})

function RouteComponent() {
	const params = Route.useParams()
	const songId = EntityId_fromStr(params().id)
	const query = useQuery(() => SongQueryOption.findById(songId))
	const correctionHistoryQuery = useQuery(() =>
		CorrectionQueryOption.history("song", songId),
	)

	return (
		<>
			<SongInfoPage
				song={query.data!}
				correctionHistory={correctionHistoryQuery.data ?? []}
			/>
		</>
	)
}
