import { Navigate, useParams, type RouteDefinition } from "@solidjs/router"
import { useQueryClient } from "@tanstack/solid-query"
import { createEffect, createMemo, Match, Switch } from "solid-js"
import { isServer } from "solid-js/web"
import { preloadLocale } from "~/lib/data/preload"
import { Query } from "~/page/artist/new_edit/data"
import { ArtistFormLayout } from "~/page/artist/new_edit/layout"
import { useI18N } from "~/state/i18n"

export const route = {
	preload: async ({ params }) => {
		if (!isServer) {
			const id = params["id"]
			const client = useQueryClient()
			void Query.prefetchData(id, client)
			const dict = await preloadLocale()
			void Query.prefetchDict(dict, client)
		}
	},
	matchFilters: {
		id: /^\d+$/,
	},
} satisfies RouteDefinition

export default function EditArtistPage() {
	const id = () => useParams()["id"]
	const dataQuery = Query.fetchData(id)
	const dictQuery = Query.fetchDict(useI18N().locale)
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
			<Match when={dataQuery.isSuccess && dictQuery.isSuccess}>
				<ArtistFormLayout data={data} />
			</Match>
		</Switch>
	)
}
