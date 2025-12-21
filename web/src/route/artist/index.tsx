import { createFileRoute } from "@tanstack/solid-router"

import { ArtistDiscover } from "~/view/artist/discover"

export const Route = createFileRoute("/artist/")({
	component: ArtistDiscover,
})
