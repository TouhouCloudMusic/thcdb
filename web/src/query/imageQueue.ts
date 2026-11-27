import type {
	InfiniteData,
	QueryClient,
	UseInfiniteQueryResult,
} from "@tanstack/solid-query"

import {
	imageQueueDetailQueryKey,
	pendingImageQueueCountQueryKey,
	pendingImageQueueInfiniteQueryKey,
	profileImageQueueInfiniteQueryKey,
	profileImageQueueWithNameInfiniteQueryKey,
} from "~/hey-api/@tanstack/solid-query.gen"
import { infiniteQueryState } from "~/utils/adapter/tanstack/infiniteQueryState"

export const IMAGE_QUEUE_PAGE_SIZE = 20

export function imageQueueListState<Item, Error>(
	query: UseInfiniteQueryResult<
		InfiniteData<{ data: { items: Item[] } }>,
		Error
	>,
) {
	return infiniteQueryState(query, (page) => page.data.items)
}

export function invalidateImageQueueLists(
	queryClient: QueryClient,
	username?: string,
) {
	const queryKeys = [
		pendingImageQueueInfiniteQueryKey(),
		pendingImageQueueCountQueryKey(),
		profileImageQueueInfiniteQueryKey(),
	]
	for (const queryKey of queryKeys) {
		void queryClient.invalidateQueries({ queryKey })
	}
	if (username !== undefined) {
		void queryClient.invalidateQueries({
			queryKey: profileImageQueueWithNameInfiniteQueryKey({
				path: { name: username },
			}),
		})
	}
}

export function invalidateAfterImageQueueSubmission(
	queryClient: QueryClient,
	entryId: number,
	username?: string,
) {
	invalidateImageQueueLists(queryClient, username)
	const [{ _id, baseUrl }] = imageQueueDetailQueryKey({ path: { id: entryId } })
	void queryClient.invalidateQueries({ queryKey: [{ _id, baseUrl }] })
}
