import { createFileRoute } from "@tanstack/solid-router"
import * as v from "valibot"

import { ImageQueueManagePage } from "~/view/image_queue/manage"

const DEFAULT_STATUS = "pending"

const searchSchema = v.object({
	type: v.fallback(v.optional(v.picklist(["artist", "release"])), undefined),
	status: v.fallback(v.picklist(["pending", "all"]), DEFAULT_STATUS),
})

export const Route = createFileRoute("/image-queue/")({
	component: RouteComponent,
	validateSearch: searchSchema,
})

function RouteComponent() {
	return <ImageQueueManagePage />
}
