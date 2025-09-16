import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, useNavigate } from "@tanstack/solid-router"
import { ReleaseQueryOption } from "@thc/query"
import { Option as O } from "effect"
import { createEffect, Show } from "solid-js"
import * as v from "valibot"

import { EntityId } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import { EditReleasePage } from "~/view/release/edit"

export const Route = createFileRoute("/release/$id/edit")({
	component: RouteComponent,
	loader: async ({ params: { id } }) => {
		const parsedId = v.parse(EntityId, Number.parseInt(id, 10))

		return await QUERY_CLIENT.ensureQueryData(
			ReleaseQueryOption.findById(parsedId),
		)
	},
})

function RouteComponent() {
	const params = Route.useParams()
	const id = params().id
	const parsedId = v.parse(EntityId, Number.parseInt(id, 10))
	const query = useQuery(() => ReleaseQueryOption.findById(parsedId))

	const nav = useNavigate()
	createEffect(() => {
		if (query.isError) {
			void nav({ to: "/" })
		}
	})

	return (
		<Show when={query.data}>
			{(r) => (
				<EditReleasePage
					type="edit"
					release={O.getOrThrow(r())}
				/>
			)}
		</Show>
	)
}
