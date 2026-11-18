import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound } from "@tanstack/solid-router"
import { ArtistQueryOption, CorrectionQueryOption } from "@thc/query"
import { Option as O } from "effect"
import { Show } from "solid-js"

import { loadEntityId } from "~/route/-entityId"
import { QUERY_CLIENT } from "~/state/tanstack"
import { EntityCorrectionListPage } from "~/view/correction/EntityCorrectionListPage"

export const Route = createFileRoute("/artist/$id_/corrections")({
	component: RouteComponent,
	beforeLoad: loadEntityId,
	loader: async ({ context: { entityId: parsedId } }) => {
		const data = await QUERY_CLIENT.ensureQueryData(
			ArtistQueryOption.findById(parsedId),
		)
		if (O.isNone(data)) {
			throw notFound()
		}

		await QUERY_CLIENT.ensureQueryData(
			CorrectionQueryOption.history("artist", parsedId),
		)

		return data
	},
})

function RouteComponent() {
	const { entityId: artistId } = Route.useRouteContext()()
	const query = useQuery(() => ArtistQueryOption.findById(artistId))

	return (
		<Show when={query.data && O.getOrUndefined(query.data)}>
			{(artist) => (
				<EntityCorrectionListPage
					entityType="artist"
					entityId={artist().id}
					entityName={artist().name}
				/>
			)}
		</Show>
	)
}
