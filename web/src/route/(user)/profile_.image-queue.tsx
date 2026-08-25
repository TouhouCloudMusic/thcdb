import { useInfiniteQuery } from "@tanstack/solid-query"
import { createFileRoute } from "@tanstack/solid-router"

import { AuthGuard } from "~/component/route"
import { profileImageQueueInfiniteOptions } from "~/hey-api/@tanstack/solid-query.gen"
import { useCurrentUser } from "~/state/user"
import {
	USER_IMAGE_QUEUE_PAGE_SIZE,
	UserImageQueuePage,
} from "~/view/image_queue/user"

const CURRENT_USER_IMAGE_QUEUE_REQUEST = {
	query: { limit: USER_IMAGE_QUEUE_PAGE_SIZE },
}

export const Route = createFileRoute("/(user)/profile_/image-queue")({
	component: RouteComponent,
})

function RouteComponent() {
	const userCtx = useCurrentUser()
	const listQuery = useInfiniteQuery(() => ({
		...profileImageQueueInfiniteOptions(CURRENT_USER_IMAGE_QUEUE_REQUEST),
		initialPageParam: CURRENT_USER_IMAGE_QUEUE_REQUEST,
		getNextPageParam: (last) => last.data.next_cursor ?? undefined,
		enabled: userCtx.profile !== undefined,
	}))
	const items = () =>
		listQuery.isSuccess
			? listQuery.data.pages.flatMap((page) => page.data.items)
			: []

	return (
		<AuthGuard>
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
		</AuthGuard>
	)
}
