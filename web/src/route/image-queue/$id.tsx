import { createFileRoute } from "@tanstack/solid-router"

import { loadEntityId } from "~/route/-entityId"
import { ImageQueueDetailPage } from "~/view/image_queue/detail"

export const Route = createFileRoute("/image-queue/$id")({
	component: RouteComponent,
	beforeLoad: loadEntityId,
})

function RouteComponent() {
	const { entityId: entryId } = Route.useRouteContext()()

	return <ImageQueueDetailPage entryId={entryId} />
}
