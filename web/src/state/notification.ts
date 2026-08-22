import type { InfiniteData } from "@tanstack/solid-query"

import type { DataNotificationPage } from "~/hey-api"
import { listNotificationsInfiniteQueryKey } from "~/hey-api/@tanstack/solid-query.gen"
import { QUERY_CLIENT } from "~/state/tanstack"

const NOTIFICATION_QUERIES = {
	queryKey: [{ tags: ["Notification"] }],
} as const

let refreshQueue = Promise.resolve()
let scheduledRefresh: Promise<void> | undefined

async function runNotificationQueryRefresh() {
	await QUERY_CLIENT.cancelQueries(NOTIFICATION_QUERIES)

	QUERY_CLIENT.setQueriesData<InfiniteData<DataNotificationPage>>(
		{ queryKey: listNotificationsInfiniteQueryKey() },
		(data) => {
			if (data === undefined || data.pages.length <= 1) return data

			return {
				pages: data.pages.slice(0, 1),
				pageParams: data.pageParams.slice(0, 1),
			}
		},
	)

	await QUERY_CLIENT.invalidateQueries(NOTIFICATION_QUERIES)
}

export async function refreshNotificationQueries() {
	if (scheduledRefresh) return scheduledRefresh

	scheduledRefresh = refreshQueue
		.catch(() => undefined)
		.then(() => {
			scheduledRefresh = undefined
			return runNotificationQueryRefresh()
		})

	refreshQueue = scheduledRefresh
	return scheduledRefresh
}
