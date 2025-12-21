import { createFileRoute } from "@tanstack/solid-router"

import { ReleaseDiscover } from "~/view/release/discover"

export const Route = createFileRoute("/release/")({
	component: ReleaseDiscover,
})
