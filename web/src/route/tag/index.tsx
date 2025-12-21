import { createFileRoute } from "@tanstack/solid-router"

import { TagExplore } from "~/view/tag/explore"

export const Route = createFileRoute("/tag/")({
	component: TagExplore,
})
