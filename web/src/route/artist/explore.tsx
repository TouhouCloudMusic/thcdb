import { createFileRoute } from "@tanstack/solid-router"
import * as v from "valibot"

import { ARTIST_TYPES } from "~/domain/artist/constants"
import { ArtistExplore } from "~/view/artist/explore"

const DEFAULT_LIMIT = 10

const exploreSearch = v.object({
	cursor: v.optional(v.pipe(v.number(), v.minValue(0))),
	limit: v.fallback(v.pipe(v.number(), v.minValue(1)), DEFAULT_LIMIT),
	artist_type: v.optional(v.array(v.picklist(ARTIST_TYPES))),
	sort_by: v.optional(v.picklist(["created_at", "handled_at"])),
	order_by: v.optional(v.picklist(["asc", "desc"])),
})

export const Route = createFileRoute("/artist/explore")({
	component: ArtistExplore,
	validateSearch: exploreSearch,
})
