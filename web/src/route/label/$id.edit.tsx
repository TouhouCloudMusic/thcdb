import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, useNavigate } from "@tanstack/solid-router"
import { LabelQueryOption } from "@thc/query"
import { Option as O } from "effect"
import { createEffect, Show } from "solid-js"
import * as v from "valibot"

import { EntityId } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import { EditLabelPage } from "~/view/label/edit"

export const Route = createFileRoute("/label/$id/edit")({
	component: RouteComponent,
	loader: async ({ params: { id } }) => {
		const parsedId = v.parse(EntityId, Number.parseInt(id, 10))

		return await QUERY_CLIENT.ensureQueryData(
			LabelQueryOption.findById(parsedId),
		)
	},
})

function RouteComponent() {
	const params = Route.useParams()
	const id = params().id
	const parsedId = v.parse(EntityId, Number.parseInt(id, 10))
	const query = useQuery(() => LabelQueryOption.findById(parsedId))

	const nav = useNavigate()
	createEffect(() => {
		if (query.isError) {
			void nav({ to: "/" })
		}
	})

	return (
		<Show when={query.data}>
			{(labelOption) => (
				<EditLabelPage
					type="edit"
					label={O.getOrThrow(labelOption())}
				/>
			)}
		</Show>
	)
}
