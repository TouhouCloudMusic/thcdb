import { useInfiniteQuery } from "@tanstack/solid-query"
import { createFileRoute } from "@tanstack/solid-router"
import { createMemo } from "solid-js"

import { profileImageQueueWithNameInfiniteOptions } from "~/hey-api/@tanstack/solid-query.gen"
import { IMAGE_QUEUE_PAGE_SIZE, imageQueueListState } from "~/query/imageQueue"
import { UserImageQueuePage } from "~/view/image_queue/user"

export const Route = createFileRoute("/(user)/profile_/$username_/image-queue")(
	{
		component: RouteComponent,
	},
)

function RouteComponent() {
	const params = Route.useParams()
	const request = () => ({
		path: { name: params().username },
		query: { limit: IMAGE_QUEUE_PAGE_SIZE },
	})
	const listQuery = useInfiniteQuery(() => ({
		...profileImageQueueWithNameInfiniteOptions(request()),
		initialPageParam: request(),
		getNextPageParam: (last) => last.data.next_cursor ?? undefined,
	}))
	const list = createMemo(() => imageQueueListState(listQuery))

	return (
		<UserImageQueuePage
			username={params().username}
			list={list()}
		/>
	)
}
