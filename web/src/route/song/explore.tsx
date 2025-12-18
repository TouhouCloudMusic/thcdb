import { createFileRoute } from "@tanstack/solid-router"
import * as v from "valibot"

import { SongExplore } from "~/view/song/explore"

const DEFAULT_LIMIT = 10

const exploreSearch = v.object({
	cursor: v.fallback(v.optional(v.pipe(v.number(), v.minValue(0))), undefined),
	limit: v.fallback(v.pipe(v.number(), v.minValue(1)), DEFAULT_LIMIT),
	language_id: v.optional(v.array(v.number())),
	sort_by: v.fallback(
		v.optional(v.picklist(["created_at", "handled_at"])),
		undefined,
	),
	order_by: v.fallback(v.optional(v.picklist(["asc", "desc"])), undefined),
})

export const Route = createFileRoute("/song/explore")({
	component: SongExplore,
	validateSearch: exploreSearch,
})
