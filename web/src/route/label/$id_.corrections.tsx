import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound } from "@tanstack/solid-router"
import { CorrectionQueryOption, LabelQueryOption } from "@thc/query"
import { Option as O } from "effect"
import { Show } from "solid-js"

import { loadEntityId } from "~/route/-entityId"
import { QUERY_CLIENT } from "~/state/tanstack"
import { EntityCorrectionListPage } from "~/view/correction/EntityCorrectionListPage"

export const Route = createFileRoute("/label/$id_/corrections")({
	component: RouteComponent,
	beforeLoad: loadEntityId,
	loader: async ({ context: { entityId: parsedId } }) => {
		const data = await QUERY_CLIENT.ensureQueryData(
			LabelQueryOption.findById(parsedId),
		)
		if (O.isNone(data)) {
			throw notFound()
		}

		await QUERY_CLIENT.ensureQueryData(
			CorrectionQueryOption.history("label", parsedId),
		)

		return data
	},
})

function RouteComponent() {
	const { entityId: labelId } = Route.useRouteContext()()
	const query = useQuery(() => LabelQueryOption.findById(labelId))

	return (
		<Show when={query.data && O.getOrUndefined(query.data)}>
			{(label) => (
				<EntityCorrectionListPage
					entityType="label"
					entityId={label().id}
					entityName={label().name}
				/>
			)}
		</Show>
	)
}
