import { useQuery } from "@tanstack/solid-query"
import { createFileRoute } from "@tanstack/solid-router"

import { pendingImageQueueCountOptions } from "~/hey-api/@tanstack/solid-query.gen"
import { ModerationQueueIndex } from "~/view/moderation"

function RouteComponent() {
	const pendingCount = useQuery(() => pendingImageQueueCountOptions())
	return <ModerationQueueIndex pendingCount={pendingCount.data?.data} />
}

export const Route = createFileRoute("/moderation")({
	component: RouteComponent,
})
