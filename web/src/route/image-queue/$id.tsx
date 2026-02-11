import { createFileRoute } from "@tanstack/solid-router"
import { ImageQueueQueryOption } from "@thc/query"

import { AuthGuard } from "~/component/route"
import { EntityId_fromStr } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import { ImageQueueDetailPage } from "~/view/image_queue/detail"

export const Route = createFileRoute("/image-queue/$id")({
	component: RouteComponent,
	loader: async ({ params: { id } }) => {
		const parsedId = EntityId_fromStr(id)

		await QUERY_CLIENT.ensureQueryData(ImageQueueQueryOption.detail(parsedId))
	},
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
