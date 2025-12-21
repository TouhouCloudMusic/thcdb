import { createFileRoute } from "@tanstack/solid-router"

import { EventDiscover } from "~/view/event/discover"

export const Route = createFileRoute("/event/")({
	component: EventDiscover,
})
