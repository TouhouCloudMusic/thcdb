import { Navigate, useParams, type RouteDefinition } from "@solidjs/router"
import { useQueryClient } from "@tanstack/solid-query"
import { createEffect, Suspense } from "solid-js"
import { preloadLocale } from "~/lib/data/preload"
import { Query } from "~/page/artist/edit/data"
import { ArtistFormLayout } from "~/page/artist/edit/layout"

export const route = {
	preload: async ({ params }) => {
		const id = params["id"]
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

	createEffect(() => {
		if (dataQuery.isSuccess && dataQuery.data === null) {
			Navigate({
				href: "/404",
			})
		}
	})
	return <ArtistFormLayout dataQuery={dataQuery} />
}
