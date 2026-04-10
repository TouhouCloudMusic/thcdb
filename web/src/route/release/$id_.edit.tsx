import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound, useNavigate } from "@tanstack/solid-router"
import { ReleaseQueryOption } from "@thc/query"
import { Option as O } from "effect"
import { createEffect, Show } from "solid-js"

import { AuthGuard } from "~/component/route"
import { EntityId_fromStr } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import { EditReleasePage } from "~/view/release/edit"

export const Route = createFileRoute("/release/$id_/edit")({
	component: RouteComponent,
	loader: async ({ params: { id } }) => {
		const parsedId = EntityId_fromStr(id)

		const data = await QUERY_CLIENT.ensureQueryData(
			ReleaseQueryOption.findById(parsedId),
		)
		if (O.isNone(data)) {
			throw notFound()
		}
		return data
	},
})

function RouteComponent() {
	const params = Route.useParams()
	const id = params().id
	const parsedId = EntityId_fromStr(id)
	const query = useQuery(() => ReleaseQueryOption.findById(parsedId))

	const nav = useNavigate()
	createEffect(() => {
		if (query.isError) {
			void nav({ to: "/" })
		}
	})

	return (
		<AuthGuard>
			<Show when={query.data}>
				{(r) => (
					<EditReleasePage
						type="edit"
						release={O.getOrThrow(r())}
					/>
				)}
			</Show>
		</AuthGuard>
	)
}
