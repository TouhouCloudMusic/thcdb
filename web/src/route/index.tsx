import { useQuery } from "@tanstack/solid-query"
import { createFileRoute } from "@tanstack/solid-router"
import { ArtistApi, EventApi, ReleaseApi, TagApi } from "@thc/api"
import { HomeQueryOption } from "@thc/query"
import dayjs from "dayjs"
import { Either } from "effect"

import { HomePage } from "~/view/Homepage"
import {
	ARTISTS_LIMIT,
	EVENTS_LIMIT,
	RELEASES_LIMIT,
	TAGS_LIMIT,
} from "~/view/Homepage/constants"

const EVENTS_QUERY_LIMIT = 20

function RouteComponent() {
	const metadataQuery = useQuery(() => HomeQueryOption.metadata())
	const releasesQuery = useQuery(() => ({
		queryKey: ["home::releases", RELEASES_LIMIT],
		queryFn: async () => {
			const res = await ReleaseApi.explore({
				query: {
					page: 1,
					limit: RELEASES_LIMIT,
					sort_field: "created_at",
					sort_direction: "desc",
				},
			})
			const paginated = Either.getOrThrowWith(res, (error) => {
				throw error
			})
			return paginated.items
		},
	}))
	const artistsQuery = useQuery(() => ({
		queryKey: ["home::artists", ARTISTS_LIMIT],
		queryFn: async () => {
			const res = await ArtistApi.explore({
				query: {
					page: 1,
					limit: ARTISTS_LIMIT,
					sort_field: "created_at",
					sort_direction: "desc",
				},
			})
			const paginated = Either.getOrThrowWith(res, (error) => {
				throw error
			})
			return paginated.items
		},
	}))
	const today = dayjs().format("YYYY-MM-DD")
	const eventsQuery = useQuery(() => ({
		queryKey: ["home::events", today, EVENTS_LIMIT],
		queryFn: async () => {
			const res = await EventApi.explore({
				query: {
					page: 1,
					limit: EVENTS_QUERY_LIMIT,
					start_date_from: today,
					sort_field: "created_at",
					sort_direction: "desc",
				},
			})
			const paginated = Either.getOrThrowWith(res, (error) => {
				throw error
			})
			return paginated.items
				.filter((event) => event.start_date?.value != null)
				.sort((a, b) => a.start_date!.value.localeCompare(b.start_date!.value))
				.slice(0, EVENTS_LIMIT)
		},
	}))
	const tagsQuery = useQuery(() => ({
		queryKey: ["home::tags", TAGS_LIMIT],
		queryFn: async () => {
			const res = await TagApi.explore({
				query: {
					page: 1,
					limit: TAGS_LIMIT,
					sort_field: "created_at",
					sort_direction: "desc",
				},
			})
			const paginated = Either.getOrThrowWith(res, (error) => {
				throw error
			})
			return paginated.items
		},
	}))

	return (
		<HomePage
			metadata={metadataQuery.data}
			releases={(releasesQuery.data ?? []).slice(0, RELEASES_LIMIT)}
			artists={(artistsQuery.data ?? []).slice(0, ARTISTS_LIMIT)}
			events={eventsQuery.data ?? []}
			tags={(tagsQuery.data ?? []).slice(0, TAGS_LIMIT)}
		/>
	)
}

export const Route = createFileRoute("/")({
	component: RouteComponent,
})
