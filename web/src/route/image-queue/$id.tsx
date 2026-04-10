import { createFileRoute } from "@tanstack/solid-router"

import { AuthGuard } from "~/component/route"
import { EntityId_fromStr } from "~/domain/shared"
import { ImageQueueDetailPage } from "~/view/image_queue/detail"

export const Route = createFileRoute("/image-queue/$id")({
	component: RouteComponent,
})

function RouteComponent() {
	const params = Route.useParams()
	const entryId = EntityId_fromStr(params().id)

	return (
		<AuthGuard>
			<ImageQueueDetailPage entryId={entryId} />
		</AuthGuard>
	)
}
