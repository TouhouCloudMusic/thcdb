import { createFileRoute } from "@tanstack/solid-router"
import * as v from "valibot"

import { RELEASE_TYPES } from "~/domain/release/constants"
import { ReleaseExplore } from "~/view/release/explore"

const DEFAULT_LIMIT = 10

const exploreSearch = v.object({
	cursor: v.optional(v.pipe(v.number(), v.minValue(0))),
	limit: v.fallback(v.pipe(v.number(), v.minValue(1)), DEFAULT_LIMIT),
	release_type: v.optional(v.array(v.picklist(RELEASE_TYPES))),
	sort_by: v.optional(v.picklist(["created_at", "handled_at"])),
	order_by: v.optional(v.picklist(["asc", "desc"])),
})

export const Route = createFileRoute("/release/explore")({
	component: ReleaseExplore,
	validateSearch: exploreSearch,
})
