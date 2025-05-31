import { useInfiniteQuery, useQuery } from "@tanstack/solid-query"
import { createFileRoute } from "@tanstack/solid-router"
import { createEffect } from "solid-js"
import { createStore, produce } from "solid-js/store"
import * as v from "valibot"

import type { Discography } from "~/api/artist"
import { ArtistQueryOption } from "~/api/artist"
import type { ReleaseType } from "~/api/release"
import { RELEASE_TYPES } from "~/api/release"
import { EntityId } from "~/api/shared/schema"
import { TanstackQueryClinet } from "~/state/tanstack"
import { Obj } from "~/utils/data"
import { ArtistProfilePage } from "~/views/artist/profile"

export const Route = createFileRoute("/artist/$id")({
	component: RouteComponent,
	loader: async ({ params: { id } }) => {
		const parsedId = v.parse(EntityId, Number.parseInt(id, 10))

		return await TanstackQueryClinet.ensureQueryData(
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
		Obj.fromEntries(RELEASE_TYPES.map((ty) => [ty, [] as Discography[]])),
	)

	const discography = Obj.fromEntries(
		RELEASE_TYPES.map((type) => [
			type,
			useInfiniteQuery(() =>
				Obj.merge(ArtistQueryOption.discography(artistId, type), {
					initialPageParam: 0,
					getNextPageParam: (last) => last.next_cursor,
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
						v[type].push(...query.data.pages.at(-1)!.items)
						// v[type] = query.data.pages.flatMap((p) => p.items)
					}),
				)
			}
		})
	}

	return (
		<>
			<ArtistProfilePage
				artist={query.data!}
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
		</>
	)
}
