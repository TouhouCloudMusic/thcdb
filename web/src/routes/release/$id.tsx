import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound } from "@tanstack/solid-router"
import { ReleaseQueryOption } from "@thc/query"
import { Option as O } from "effect"
import { Show } from "solid-js"
import * as v from "valibot"

import { EntityId } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import { ReleaseInfoPage } from "~/views/release/Info"

export const Route = createFileRoute("/release/$id")({
	component: RouteComponent,
	loader: async ({ params }) => {
		const parsedId = v.parse(EntityId, Number.parseInt(params.id, 10))
		return await QUERY_CLIENT.ensureQueryData(
			ReleaseQueryOption.findById(parsedId),
		)
	},
})

function RouteComponent() {
	const params = Route.useParams()
	const releaseId = v.parse(EntityId, Number.parseInt(params().id, 10))
	const query = useQuery(() => ReleaseQueryOption.findById(releaseId))

	return (
		<Show when={query.data && O.getOrThrowWith(query.data, () => notFound())}>
			{(release) => <ReleaseInfoPage release={release()} />}
		</Show>
	)
}
