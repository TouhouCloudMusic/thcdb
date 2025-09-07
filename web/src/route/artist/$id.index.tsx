import { useInfiniteQuery, useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound } from "@tanstack/solid-router"
import type { ReleaseType, Discography } from "@thc/api"
import { ArtistQueryOption } from "@thc/query"
import { ObjExt } from "@thc/toolkit/data"
import { Option as O } from "effect"
import { createEffect, Show } from "solid-js"
import { createStore, produce } from "solid-js/store"
import * as v from "valibot"

import { RELEASE_TYPES } from "~/domain/release"
import { EntityId } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import { ArtistProfilePage } from "~/view/artist/profile"

export const Route = createFileRoute("/artist/$id/")({
	component: RouteComponent,
	loader: async ({ params: { id } }) => {
		const parsedId = v.parse(EntityId, Number.parseInt(id, 10))

		return await QUERY_CLIENT.ensureQueryData(
			ArtistQueryOption.findById(parsedId),
		)
	},
	// errorComponent: () => {
	// 	return <Navigate to="/" />
	// },
})

// oxlint-disable-next-line max-lines-per-function
function RouteComponent() {
	const params = Route.useParams()
	const artistId = Number.parseInt(params().id, 10)
	const query = useQuery(() => ArtistQueryOption.findById(artistId))

	const appearances = useInfiniteQuery(() =>
		ArtistQueryOption.appearances(artistId),
	)

	const credits = useInfiniteQuery(() => ArtistQueryOption.credits(artistId))

	// Discographies

	const initDiscographies = useQuery(() =>
		ArtistQueryOption.discographyInit(artistId),
	)

	const [discographyMap, setDiscographyMap] = createStore(
		ObjExt.fromEntries(RELEASE_TYPES.map((ty) => [ty, [] as Discography[]])),
	)

	const discography = ObjExt.fromEntries(
		RELEASE_TYPES.map((type) => [
			type,
			useInfiniteQuery(() =>
				ObjExt.merge(ArtistQueryOption.discography(artistId, type), {
					initialPageParam: 0,
					getNextPageParam: (x) => x.next_cursor,
				}),
			),
		]),
	)

	for (const type of RELEASE_TYPES) {
		createEffect(() => {
			const query = discography[type]
			if (query.isSuccess) {
				setDiscographyMap(
					produce((v) => {
						const lastPage = query.data.pages.at(-1)
						if (lastPage) {
							v[type].push(...lastPage.items)
						}
					}),
				)
			}
		})
	}

	return (
		<Show when={query.data && O.getOrThrowWith(query.data, () => notFound())}>
			{(artist) => (
				<ArtistProfilePage
					artist={artist()}
					appearances={{
						get data() {
							return appearances.data?.pages.flatMap((p) => p.items) ?? []
						},
						get hasNext() {
							return appearances.hasNextPage
						},
						async next() {
							await appearances.fetchNextPage()
							return
						},
						get isLoading() {
							return appearances.isLoading
						},
					}}
					credits={{
						get data() {
							return credits.data?.pages.flatMap((p) => p.items) ?? []
						},
						get hasNext() {
							return credits.hasNextPage
						},
						async next() {
							await credits.fetchNextPage()
							return
						},
						get isLoading() {
							return credits.isLoading
						},
					}}
					discographies={{
						get data() {
							return discographyMap
						},
						hasNext(type: ReleaseType) {
							return discography[type].hasNextPage
						},
						async next(type: ReleaseType): Promise<void> {
							if (discography[type].isFetchingNextPage) return

							await discography[type].fetchNextPage()
						},
						get isLoading() {
							return initDiscographies.isLoading
						},
					}}
				/>
			)}
		</Show>
	)
}
