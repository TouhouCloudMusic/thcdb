import { type RouteDefinition } from "@solidjs/router"
import { useQueryClient } from "@tanstack/solid-query"
import { preloadLocale } from "~/lib/data/preload"
import { Query } from "../data"
import { ArtistFormLayout } from "../layout"

export const route = {
	preload: async () => {
		const client = useQueryClient()
		void Query.prefetchDict(await preloadLocale(), client)
	},
} satisfies RouteDefinition

export default function AddArtistPage() {
	return <ArtistFormLayout />
}
