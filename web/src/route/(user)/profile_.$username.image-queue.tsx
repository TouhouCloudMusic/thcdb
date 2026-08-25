import { useInfiniteQuery } from "@tanstack/solid-query"
import { createFileRoute } from "@tanstack/solid-router"

import { profileImageQueueWithNameInfiniteOptions } from "~/hey-api/@tanstack/solid-query.gen"
import {
	USER_IMAGE_QUEUE_PAGE_SIZE,
	UserImageQueuePage,
} from "~/view/image_queue/user"

export const Route = createFileRoute("/(user)/profile_/$username/image-queue")({
	component: RouteComponent,
})

function RouteComponent() {
	const params = Route.useParams()
	const request = () => ({
		path: { name: params().username },
		query: { limit: USER_IMAGE_QUEUE_PAGE_SIZE },
	})
	const listQuery = useInfiniteQuery(() => ({
		...profileImageQueueWithNameInfiniteOptions(request()),
		initialPageParam: request(),
		getNextPageParam: (last) => last.data.next_cursor ?? undefined,
	}))
	const items = () =>
		listQuery.isSuccess
			? listQuery.data.pages.flatMap((page) => page.data.items)
			: []

	return (
		<UserImageQueuePage
			items={items()}
			isLoading={listQuery.isLoading}
			isError={listQuery.isError}
			hasNextPage={listQuery.hasNextPage}
			isFetchingNextPage={listQuery.isFetchingNextPage}
			onLoadMore={() => {
				void listQuery.fetchNextPage()
			}}
		/>
	)
}
