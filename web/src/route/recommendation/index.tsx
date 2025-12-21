import { createFileRoute } from "@tanstack/solid-router"

import { RecommendationDiscover } from "~/view/recommendation/discover"

export const Route = createFileRoute("/recommendation/")({
	component: RecommendationDiscover,
})
