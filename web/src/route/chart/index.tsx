import { createFileRoute } from "@tanstack/solid-router"

import { ChartDiscover } from "~/view/chart/discover"

export const Route = createFileRoute("/chart/")({
	component: ChartDiscover,
})
