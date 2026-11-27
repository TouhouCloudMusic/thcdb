import { useInfiniteQuery } from "@tanstack/solid-query"
import { createFileRoute } from "@tanstack/solid-router"
import { createMemo } from "solid-js"

import { AuthGuard } from "~/component/route"
import { profileImageQueueInfiniteOptions } from "~/hey-api/@tanstack/solid-query.gen"
import { IMAGE_QUEUE_PAGE_SIZE, imageQueueListState } from "~/query/imageQueue"
import { useCurrentUser } from "~/state/user"
import { UserImageQueuePage } from "~/view/image_queue/user"

const CURRENT_USER_IMAGE_QUEUE_REQUEST = {
	query: { limit: IMAGE_QUEUE_PAGE_SIZE },
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
	const list = createMemo(() => imageQueueListState(listQuery))

	return (
		<AuthGuard>
			<UserImageQueuePage
				username={userCtx.profile?.name}
				list={list()}
			/>
		</AuthGuard>
	)
}
