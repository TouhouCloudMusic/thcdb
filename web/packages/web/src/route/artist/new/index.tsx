import { type RouteDefinition } from "@solidjs/router"
import { useQueryClient } from "@tanstack/solid-query"
import { isServer } from "solid-js/web"
import { preloadLocale } from "~/lib/data/preload"
import { Query } from "~/page/artist/new/edit/data"
import { ArtistFormLayout } from "~/page/artist/new/edit/layout"

export const route = {
	preload: async () => {
		if (!isServer) {
			const client = useQueryClient()
			void Query.prefetchDict(await preloadLocale(), client)
		}
	},
} satisfies RouteDefinition

export default function AddArtistPage() {
	return <ArtistFormLayout />
}
