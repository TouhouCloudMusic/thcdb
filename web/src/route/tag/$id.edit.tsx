import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, useNavigate } from "@tanstack/solid-router"
import { TagQueryOption } from "@thc/query"
import { Option as O } from "effect"
import { createEffect, Show } from "solid-js"
import * as v from "valibot"

import { EntityId } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import { EditTagPage } from "~/view/tag/edit"

export const Route = createFileRoute("/tag/$id/edit")({
	component: RouteComponent,
	loader: async ({ params: { id } }) => {
		const parsedId = v.parse(EntityId, Number.parseInt(id, 10))

		return await QUERY_CLIENT.ensureQueryData(TagQueryOption.findById(parsedId))
	},
})

function RouteComponent() {
	const params = Route.useParams()
	const id = params().id
	const parsedId = v.parse(EntityId, Number.parseInt(id, 10))
	const query = useQuery(() => TagQueryOption.findById(parsedId))

	const nav = useNavigate()
	createEffect(() => {
		// TODO: Error handling
		if (query.isError) {
			void nav({ to: "/" })
		}
	})

	return (
		<Show when={query.data}>
			{(tagOption) => (
				<EditTagPage
					type="edit"
					tag={O.getOrThrow(tagOption())}
				/>
			)}
		</Show>
	)
}
