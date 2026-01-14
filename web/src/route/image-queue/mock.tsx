import { createFileRoute } from "@tanstack/solid-router"

import { ImageQueueMockPage } from "~/view/image_queue/mock"

export const Route = createFileRoute("/image-queue/mock")({
	component: ImageQueueMockPage,
})
