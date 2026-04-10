import { useInfiniteQuery, useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound } from "@tanstack/solid-router"
import type { Discography, InitDiscography, ReleaseType } from "@thc/api"
import { ArtistApi } from "@thc/api"
import { ArtistQueryOption, CorrectionQueryOption } from "@thc/query"
import { ObjExt } from "@thc/toolkit/data"
import { Either, Option as O } from "effect"
import { Show } from "solid-js"
import { createStore } from "solid-js/store"

import { RELEASE_TYPES } from "~/domain/release"
import { EntityId_fromStr } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import { ArtistProfilePage } from "~/view/artist/profile"

const DISCOGRAPHY_PAGE_LIMIT = 10

const INIT_DISCOGRAPHY_KEYS = {
	Album: "album",
	Compilation: "compilation",
	Demo: "demo",
	Ep: "ep",
	Other: "other",
	Single: "single",
} satisfies Record<ReleaseType, keyof InitDiscography>

export const Route = createFileRoute("/artist/$id/")({
	component: RouteComponent,
	loader: async ({ params: { id } }) => {
		const parsedId = EntityId_fromStr(id)

		const [data] = await Promise.all([
			QUERY_CLIENT.ensureQueryData(ArtistQueryOption.findById(parsedId)),
			QUERY_CLIENT.ensureQueryData(
				CorrectionQueryOption.history("artist", parsedId),
			),
		])
		if (O.isNone(data)) {
			throw notFound()
		}
		return data
	},
	// errorComponent: () => {
	// 	return <Navigate to="/" />
	// },
})

function RouteComponent() {
	const params = Route.useParams()
	const artistId = Number.parseInt(params().id, 10)
	const query = useQuery(() => ArtistQueryOption.findById(artistId))
	const correctionHistoryQuery = useQuery(() =>
		CorrectionQueryOption.history("artist", artistId),
	)

	const appearances = useInfiniteQuery(() =>
		ArtistQueryOption.appearances(artistId),
	)

	const credits = useInfiniteQuery(() => ArtistQueryOption.credits(artistId))

	// Discographies

	const initDiscographies = useQuery(() =>
		ArtistQueryOption.discographyInit(artistId),
	)

	const [extraDiscographies, setExtraDiscographies] = createStore(
		ObjExt.fromEntries(
			RELEASE_TYPES.map((type) => [
				type,
				{
					items: [] as Discography[],
					isLoading: false,
					nextCursor: undefined as number | null | undefined,
				},
			]),
		),
	)

	const getInitDiscography = (type: ReleaseType) => {
		const data = initDiscographies.data
		if (!data) return

		return data[INIT_DISCOGRAPHY_KEYS[type]]
	}

	const getDiscographyItems = (type: ReleaseType) => {
		const initialItems = getInitDiscography(type)?.items ?? []
		return initialItems.concat(extraDiscographies[type].items)
	}

	const getDiscographyNextCursor = (type: ReleaseType) => {
		const nextCursor = extraDiscographies[type].nextCursor
		if (nextCursor !== undefined) {
			return nextCursor
		}

		return getInitDiscography(type)?.next_cursor
	}

	const loadMoreDiscographies = async (type: ReleaseType): Promise<void> => {
		if (extraDiscographies[type].isLoading) return

		const cursor = getDiscographyNextCursor(type)
		if (cursor == null) return

		setExtraDiscographies(type, "isLoading", true)

		try {
			const result = await ArtistApi.findDiscographiesByType({
				path: { id: artistId },
				query: {
					cursor,
					release_type: type,
					limit: DISCOGRAPHY_PAGE_LIMIT,
				},
			})

			const data = Either.match(result, {
				onRight: (value) => value,
				onLeft: (error) => {
					throw error
				},
			})

			setExtraDiscographies(type, "items", (items) => items.concat(data.items))
			setExtraDiscographies(type, "nextCursor", data.next_cursor)
		} finally {
			setExtraDiscographies(type, "isLoading", false)
		}
	}

	return (
		<Show when={query.data && O.getOrThrowWith(query.data, () => notFound())}>
			{(artist) => (
				<ArtistProfilePage
					artist={artist()}
					correctionHistory={correctionHistoryQuery.data ?? []}
					appearances={{
						get data() {
							return appearances.data?.pages.flatMap((p) => p.items) ?? []
						},
						get hasNext() {
							return appearances.hasNextPage
						},
						async next() {
							await appearances.fetchNextPage()
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
						},
						get isLoading() {
							return credits.isLoading
						},
					}}
					discographies={{
						get data() {
							return ObjExt.fromEntries(
								RELEASE_TYPES.map((type) => [type, getDiscographyItems(type)]),
							)
						},
						hasNext(type: ReleaseType) {
							return getDiscographyNextCursor(type) != null
						},
						async next(type: ReleaseType): Promise<void> {
							await loadMoreDiscographies(type)
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
