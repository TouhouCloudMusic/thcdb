import { useQuery } from "@tanstack/solid-query"
import { createFileRoute } from "@tanstack/solid-router"
import { EventApi, TagApi } from "@thc/api"
import dayjs from "dayjs"
import { Either } from "effect"

import { getHomeOptions } from "~/hey-api/@tanstack/solid-query.gen"
import { HomePage } from "~/view/Homepage"
import { EVENTS_LIMIT, TAGS_LIMIT } from "~/view/Homepage/constants"

const EVENTS_QUERY_LIMIT = 20

function RouteComponent() {
	const homeQuery = useQuery(() => getHomeOptions())
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
			statistics={homeQuery.data?.data.statistics}
			releases={homeQuery.data?.data.popular.releases ?? []}
			artists={homeQuery.data?.data.popular.artists ?? []}
			events={eventsQuery.data ?? []}
			tags={(tagsQuery.data ?? []).slice(0, TAGS_LIMIT)}
		/>
	)
}

export const Route = createFileRoute("/")({
	component: RouteComponent,
})
