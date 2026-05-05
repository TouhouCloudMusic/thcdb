import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound, useNavigate } from "@tanstack/solid-router"
import { ArtistQueryOption } from "@thc/query"
import { Option as O } from "effect"
import { createEffect, Show } from "solid-js"

import { AuthGuard } from "~/component/route"
import { EntityId_fromStr } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import { EditArtistPage } from "~/view/artist/edit"
import {
	ensurePendingCorrectionEditable,
	getEditSearchDeps,
	pendingCorrectionEditSearchSchema,
	PendingCorrectionBoundary,
} from "~/view/correction/pendingCorrection"

export const Route = createFileRoute("/artist/$id_/edit")({
	component: RouteComponent,
	validateSearch: pendingCorrectionEditSearchSchema,
	loaderDeps: getEditSearchDeps,
	loader: async ({ params: { id }, deps }) => {
		const parsedId = EntityId_fromStr(id)

		const data = await QUERY_CLIENT.ensureQueryData(
			ArtistQueryOption.findById(parsedId),
		)
		if (O.isNone(data)) {
			throw notFound()
		}

		const pendingCorrectionGate = await ensurePendingCorrectionEditable(
			QUERY_CLIENT,
			"artist",
			parsedId,
			deps.correctionId,
		)

		return {
			data,
			...pendingCorrectionGate,
		}
	},
})

function RouteComponent() {
	const params = Route.useParams()
	const id = params().id
	const parsedId = EntityId_fromStr(id)
	const query = useQuery(() => ArtistQueryOption.findById(parsedId))
	const loaderData = Route.useLoaderData()
	const editCorrectionId = () => loaderData().editCorrectionId
	const blockingCorrectionId = () => loaderData().blockingCorrectionId

	const nav = useNavigate()
	createEffect(() => {
		if (query.isError) {
			// TODO: Show error message
			void nav({
				to: "/",
			})
		}
	})

	return (
		<AuthGuard>
			<PendingCorrectionBoundary correctionId={blockingCorrectionId()}>
				<Show when={query.data}>
					{(a) => (
						<EditArtistPage
							type="edit"
							artist={O.getOrThrow(a())}
							pendingCorrectionId={editCorrectionId()}
						/>
					)}
				</Show>
			</PendingCorrectionBoundary>
		</AuthGuard>
	)
}
