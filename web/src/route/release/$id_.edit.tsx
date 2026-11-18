import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound, useNavigate } from "@tanstack/solid-router"
import { ReleaseQueryOption } from "@thc/query"
import { Option as O } from "effect"
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
import { EditReleasePage } from "~/view/release/edit"

export const Route = createFileRoute("/release/$id_/edit")({
	component: RouteComponent,
	beforeLoad: loadEntityId,
	validateSearch: pendingCorrectionEditSearchSchema,
	loaderDeps: getEditSearchDeps,
	loader: async ({ context: { entityId: parsedId }, deps }) => {
		void QUERY_CLIENT.prefetchQuery(languageListQueryOptions())

		const data = await QUERY_CLIENT.ensureQueryData(
			ReleaseQueryOption.findById(parsedId),
		)
		if (O.isNone(data)) {
			throw notFound()
		}

		const pendingCorrectionGate = await ensurePendingCorrectionEditable(
			QUERY_CLIENT,
			"release",
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
	const query = useQuery(() => ReleaseQueryOption.findById(parsedId))
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
					{(r) => (
						<EditReleasePage
							type="edit"
							release={O.getOrThrow(r())}
							pendingCorrectionId={editCorrectionId()}
						/>
					)}
				</Show>
			</PendingCorrectionBoundary>
		</AuthGuard>
	)
}
