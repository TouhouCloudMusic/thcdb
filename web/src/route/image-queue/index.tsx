import { createFileRoute } from "@tanstack/solid-router"
import * as v from "valibot"

import { AuthGuard } from "~/component/route"
import { ImageQueueManagePage } from "~/view/image_queue/manage"

const DEFAULT_STATUS = "pending"

const searchSchema = v.object({
	type: v.optional(v.picklist(["artist", "release"])),
	status: v.fallback(v.picklist(["pending", "all"]), DEFAULT_STATUS),
})

export const Route = createFileRoute("/image-queue/")({
	component: RouteComponent,
	validateSearch: searchSchema,
})

function RouteComponent() {
	return (
		<AuthGuard>
			<ImageQueueManagePage />
		</AuthGuard>
	)
}
