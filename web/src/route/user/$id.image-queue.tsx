import { createFileRoute } from "@tanstack/solid-router"
import * as v from "valibot"

import { AuthGuard } from "~/component/route"
import { EntityId } from "~/domain/shared"
import { UserImageQueuePage } from "~/view/image_queue/user"

export const Route = createFileRoute("/user/$id/image-queue")({
	component: RouteComponent,
})

function RouteComponent() {
	const params = Route.useParams()
	const userId = v.parse(EntityId, Number.parseInt(params().id, 10))

	return (
		<AuthGuard>
			<UserImageQueuePage userId={userId} />
		</AuthGuard>
	)
}
