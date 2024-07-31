import { Navigate, useParams, type RouteDefinition } from "@solidjs/router"
import { useQueryClient } from "@tanstack/solid-query"
import { createEffect, createMemo, Match, Switch } from "solid-js"
import { preloadLocale } from "~/lib/data/preload"
import { Query } from "../data"
import { ArtistFormLayout } from "../layout"

export const route = {
	preload: async (args) => {
		const id = args.params["id"]
		const client = useQueryClient()
		void Query.prefetchData(id, client)

		void Query.prefetchDict(await preloadLocale(), client)
	},
	matchFilters: {
		id: /^\d+$/,
	},
} satisfies RouteDefinition

export default function EditArtistPage() {
	const id = () => useParams()["id"]
	const dataQuery = Query.fetchData(id)
	const data = createMemo(() => dataQuery.data)

	createEffect(() => {
		if (dataQuery.isSuccess && dataQuery.data === null) {
			Navigate({
				href: "/404",
			})
		}
	})
	return (
		<Switch>
			<Match when={dataQuery.isError}>
				<Navigate href="/500" />
			</Match>
			<Match when={dataQuery.isSuccess}>
				<ArtistFormLayout data={data} />
			</Match>
		</Switch>
	)
}
