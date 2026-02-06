import { createFileRoute } from "@tanstack/solid-router"
import * as v from "valibot"

import { RELEASE_TYPES } from "~/domain/release/constants"
import { ReleaseExplore } from "~/view/release/explore"

const DEFAULT_LIMIT = 20

const exploreSearch = v.object({
	page: v.fallback(v.pipe(v.number(), v.minValue(1)), 1),
	limit: v.fallback(v.pipe(v.number(), v.minValue(1)), DEFAULT_LIMIT),
	release_type: v.fallback(v.optional(v.picklist(RELEASE_TYPES)), undefined),
	sort_by: v.fallback(
		v.optional(v.picklist(["created_at", "handled_at"])),
		undefined,
	),
	order_by: v.fallback(v.optional(v.picklist(["asc", "desc"])), undefined),
	display_type: v.fallback(v.picklist(["wall", "list"]), "wall"),
})

export const Route = createFileRoute("/release/explore")({
	component: ReleaseExplore,
	validateSearch: exploreSearch,
})
