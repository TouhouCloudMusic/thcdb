import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound, useNavigate } from "@tanstack/solid-router"
import { LabelQueryOption } from "@thc/query"
import { Option as O } from "effect"
import { createEffect, Show } from "solid-js"

import { AuthGuard } from "~/component/route"
import { EntityId_fromStr } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import { EditLabelPage } from "~/view/label/edit"

export const Route = createFileRoute("/label/$id_/edit")({
	component: RouteComponent,
	loader: async ({ params: { id } }) => {
		const parsedId = EntityId_fromStr(id)

		const data = await QUERY_CLIENT.ensureQueryData(
			LabelQueryOption.findById(parsedId),
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
	const query = useQuery(() => LabelQueryOption.findById(parsedId))

	const nav = useNavigate()
	createEffect(() => {
		if (query.isError) {
			void nav({ to: "/" })
		}
	})

	return (
		<AuthGuard>
			<Show when={query.data}>
				{(labelOption) => (
					<EditLabelPage
						type="edit"
						label={O.getOrThrow(labelOption())}
					/>
				)}
			</Show>
		</AuthGuard>
	)
}
