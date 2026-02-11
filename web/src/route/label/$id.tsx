import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound } from "@tanstack/solid-router"
import { LabelQueryOption } from "@thc/query"
import { Option as O } from "effect"
import { Show } from "solid-js"

import { EntityId_fromStr } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import { LabelInfoPage } from "~/view/label/Info"

export const Route = createFileRoute("/label/$id")({
	component: RouteComponent,
	loader: async ({ params }) => {
		const parsedId = EntityId_fromStr(params.id)
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
	const labelId = EntityId_fromStr(params().id)
	const query = useQuery(() => LabelQueryOption.findById(labelId))

	return (
		<Show when={query.data && O.getOrThrowWith(query.data, () => notFound())}>
			{(label) => <LabelInfoPage label={label()} />}
		</Show>
	)
}
