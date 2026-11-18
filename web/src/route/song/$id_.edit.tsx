import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, useNavigate } from "@tanstack/solid-router"
import { SongQueryOption } from "@thc/query"
import { createEffect, Show } from "solid-js"

import { AuthGuard } from "~/component/route"
import { loadEntityId } from "~/route/-entityId"
import { languageListQueryOptions } from "~/state/language"
import { QUERY_CLIENT } from "~/state/tanstack"
import {
	ensurePendingCorrectionEditable,
	getEditSearchDeps,
	pendingCorrectionEditSearchSchema,
	PendingCorrectionBoundary,
} from "~/view/correction/pendingCorrection"
import { EditSongPage } from "~/view/song/edit"

export const Route = createFileRoute("/song/$id_/edit")({
	component: RouteComponent,
	beforeLoad: loadEntityId,
	validateSearch: pendingCorrectionEditSearchSchema,
	loaderDeps: getEditSearchDeps,
	loader: async ({ context: { entityId: parsedId }, deps }) => {
		void QUERY_CLIENT.prefetchQuery(languageListQueryOptions())

		const song = await QUERY_CLIENT.ensureQueryData(
			SongQueryOption.findById(parsedId),
		)

		const pendingCorrectionGate = await ensurePendingCorrectionEditable(
			QUERY_CLIENT,
			"song",
			parsedId,
			deps.correctionId,
		)

		return {
			song,
			...pendingCorrectionGate,
		}
	},
})

function RouteComponent() {
	const { entityId: parsedId } = Route.useRouteContext()()
	const query = useQuery(() => SongQueryOption.findById(parsedId))
	const loaderData = Route.useLoaderData()
	const editCorrectionId = () => loaderData().editCorrectionId
	const blockingCorrectionId = () => loaderData().blockingCorrectionId

	const nav = useNavigate()
	createEffect(() => {
		if (query.isError) {
			void nav({ to: "/" })
		}
	})

	return (
		<AuthGuard>
			<PendingCorrectionBoundary correctionId={blockingCorrectionId()}>
				<Show when={query.data}>
					{(song) => (
						<EditSongPage
							type="edit"
							song={song()}
							pendingCorrectionId={editCorrectionId()}
						/>
					)}
				</Show>
			</PendingCorrectionBoundary>
		</AuthGuard>
	)
}
