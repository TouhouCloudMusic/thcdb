import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound, useNavigate } from "@tanstack/solid-router"
import { TagQueryOption } from "@thc/query"
import { Option as O } from "effect"
import { createEffect, Show } from "solid-js"

import { AuthGuard } from "~/component/route"
import { loadEntityId } from "~/route/-entityId"
import { QUERY_CLIENT } from "~/state/tanstack"
import {
	ensurePendingCorrectionEditable,
	getEditSearchDeps,
	pendingCorrectionEditSearchSchema,
	PendingCorrectionBoundary,
} from "~/view/correction/pendingCorrection"
import { EditTagPage } from "~/view/tag/edit"

export const Route = createFileRoute("/tag/$id_/edit")({
	component: RouteComponent,
	beforeLoad: loadEntityId,
	validateSearch: pendingCorrectionEditSearchSchema,
	loaderDeps: getEditSearchDeps,
	loader: async ({ context: { entityId: parsedId }, deps }) => {
		const data = await QUERY_CLIENT.ensureQueryData(
			TagQueryOption.findById(parsedId),
		)
		if (O.isNone(data)) {
			throw notFound()
		}

		const pendingCorrectionGate = await ensurePendingCorrectionEditable(
			QUERY_CLIENT,
			"tag",
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
	const { entityId: parsedId } = Route.useRouteContext()()
	const query = useQuery(() => TagQueryOption.findById(parsedId))
	const loaderData = Route.useLoaderData()
	const editCorrectionId = () => loaderData().editCorrectionId
	const blockingCorrectionId = () => loaderData().blockingCorrectionId

	const nav = useNavigate()
	createEffect(() => {
		// TODO: Error handling
		if (query.isError) {
			void nav({ to: "/" })
		}
	})

	return (
		<AuthGuard>
			<PendingCorrectionBoundary correctionId={blockingCorrectionId()}>
				<Show when={query.data}>
					{(tagOption) => (
						<EditTagPage
							type="edit"
							tag={O.getOrThrow(tagOption())}
							pendingCorrectionId={editCorrectionId()}
						/>
					)}
				</Show>
			</PendingCorrectionBoundary>
		</AuthGuard>
	)
}
