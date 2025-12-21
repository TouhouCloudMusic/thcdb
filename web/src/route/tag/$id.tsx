import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound } from "@tanstack/solid-router"
import { TagQueryOption } from "@thc/query"
import { Option as O } from "effect"
import { Show } from "solid-js"
import * as v from "valibot"

import { EntityId } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import { TagInfoPage } from "~/view/tag/Info"

export const Route = createFileRoute("/tag/$id")({
	component: RouteComponent,
	loader: async ({ params }) => {
		const parsedId = v.parse(EntityId, Number.parseInt(params.id, 10))
		return await QUERY_CLIENT.ensureQueryData(TagQueryOption.findById(parsedId))
	},
})

function RouteComponent() {
	const params = Route.useParams()
	const tagId = v.parse(EntityId, Number.parseInt(params().id, 10))
	const query = useQuery(() => TagQueryOption.findById(tagId))

	return (
		<Show when={query.data && O.getOrThrowWith(query.data, () => notFound())}>
			{(tag) => <TagInfoPage tag={tag()} />}
		</Show>
	)
}
