import { createFileRoute } from "@tanstack/solid-router"

import { AuthGuard } from "~/component/route"
import { EntityId_fromStr } from "~/domain/shared"
import { UserImageQueuePage } from "~/view/image_queue/user"

export const Route = createFileRoute("/user/$id/image-queue")({
	component: RouteComponent,
})

function RouteComponent() {
	const params = Route.useParams()
	const userId = EntityId_fromStr(params().id)

	return (
		<AuthGuard>
			<UserImageQueuePage userId={userId} />
		</AuthGuard>
	)
}
