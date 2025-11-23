import { createFileRoute } from "@tanstack/solid-router"

import { TagDiscover } from "~/view/tag/discover"

export const Route = createFileRoute("/tag/")({
	component: TagDiscover,
})
