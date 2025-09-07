import { createFileRoute } from "@tanstack/solid-router"

import { HomePage } from "~/view/Homepage"

export const Route = createFileRoute("/")({
	component: HomePage,
})
