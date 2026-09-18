import { useInfiniteQuery, useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound } from "@tanstack/solid-router"
import type { Discography, InitDiscography, ReleaseType } from "@thc/api"
import { ArtistApi } from "@thc/api"
import { ArtistQueryOption, CorrectionQueryOption } from "@thc/query"
import { ObjExt } from "@thc/toolkit/data"
import { Either, Option as O } from "effect"
import { createMemo, createSignal, Show } from "solid-js"
import { createStore } from "solid-js/store"

import { RELEASE_TYPES } from "~/domain/release"
import { EntityId_fromStr } from "~/domain/shared"
import type { ArtistCreditScope, ArtistCreditSort } from "~/hey-api"
import {
	findManyCreditRolesSummaryOptions,
	getArtistCreditsInfiniteOptions,
} from "~/hey-api/@tanstack/solid-query.gen"
import { QUERY_CLIENT } from "~/state/tanstack"
import { createEntityVisit } from "~/state/visit"
import { ArtistProfilePage } from "~/view/artist/profile"

const DISCOGRAPHY_PAGE_LIMIT = 10
const CREDIT_PAGE_LIMIT = 10

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
	const artistId = () => Number.parseInt(params().id, 10)
	const query = useQuery(() => ArtistQueryOption.findById(artistId()))
	createEntityVisit(
		"artist",
		() => query.data && O.getOrUndefined(query.data)?.id,
	)
	const correctionHistoryQuery = useQuery(() =>
		CorrectionQueryOption.history("artist", artistId()),
	)

	const appearances = useInfiniteQuery(() =>
		ArtistQueryOption.appearances(artistId()),
	)

	const [creditScope, setCreditScope] = createSignal<ArtistCreditScope>("all")
	const [creditRoleId, setCreditRoleId] = createSignal<number>()
	const [creditSort, setCreditSort] = createSignal<ArtistCreditSort>("newest")
	const creditRoles = useQuery(() =>
		findManyCreditRolesSummaryOptions({ query: { keyword: "" } }),
	)
	const credits = useInfiniteQuery(() => {
		const request = {
			path: { id: artistId() },
			query: {
				scope: creditScope(),
				role_id: creditRoleId(),
				sort: creditSort(),
				limit: CREDIT_PAGE_LIMIT,
			},
		}
		const options = getArtistCreditsInfiniteOptions(request)
		options.initialPageParam = request
		options.getNextPageParam = (last) => {
			const cursor = last.data.next_cursor
			if (cursor == null) return undefined

			return cursor
		}
		return options
	})
	const creditData = createMemo(() => {
		if (credits.isPending) return { release: [], song: [] }
		return {
			release: credits.data?.pages.flatMap((page) => page.data.release) ?? [],
			song: credits.data?.pages.flatMap((page) => page.data.song) ?? [],
		}
	})

	// Discographies

	const initDiscographies = useQuery(() =>
		ArtistQueryOption.discographyInit(artistId()),
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
				path: { id: artistId() },
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
							return creditData()
						},
						get scope() {
							return creditScope()
						},
						get roleId() {
							return creditRoleId()
						},
						get sort() {
							return creditSort()
						},
						get roles() {
							return creditRoles.isPending ? [] : (creditRoles.data?.data ?? [])
						},
						get hasCredits() {
							return (
								creditScope() !== "all"
								|| creditRoleId() !== undefined
								|| credits.isPending
								|| credits.isError
								|| creditData().release.length > 0
								|| creditData().song.length > 0
							)
						},
						get hasNext() {
							return credits.hasNextPage
						},
						get isFetchingNextPage() {
							return credits.isFetchingNextPage
						},
						get hasError() {
							return credits.isError || creditRoles.isError
						},
						onScopeChange: setCreditScope,
						onRoleChange: setCreditRoleId,
						onSortChange: setCreditSort,
						next() {
							void credits.fetchNextPage()
						},
						retry() {
							if (creditRoles.isError) void creditRoles.refetch()
							if (credits.isFetchNextPageError) void credits.fetchNextPage()
							else if (credits.isError) void credits.refetch()
						},
						get isLoading() {
							return credits.isPending
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
