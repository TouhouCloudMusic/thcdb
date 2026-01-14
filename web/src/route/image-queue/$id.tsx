import { createFileRoute } from "@tanstack/solid-router"
import { ImageQueueQueryOption } from "@thc/query"
import * as v from "valibot"

import { AuthGuard } from "~/component/route"
import { EntityId } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import { ImageQueueDetailPage } from "~/view/image_queue/detail"

export const Route = createFileRoute("/image-queue/$id")({
	component: RouteComponent,
	loader: async ({ params: { id } }) => {
		const parsedId = v.parse(EntityId, Number.parseInt(id, 10))

		await QUERY_CLIENT.ensureQueryData(ImageQueueQueryOption.detail(parsedId))
	},
})

function RouteComponent() {
	const params = Route.useParams()
	const entryId = v.parse(EntityId, Number.parseInt(params().id, 10))

	return (
		<AuthGuard>
			<ImageQueueDetailPage entryId={entryId} />
		</AuthGuard>
	)
}
