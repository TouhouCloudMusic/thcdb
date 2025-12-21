import { createFileRoute } from "@tanstack/solid-router"
import * as v from "valibot"

import { TAG_TYPES } from "~/domain/tag/constants"
import { TagExplore } from "~/view/tag/explore"

const DEFAULT_LIMIT = 20

const exploreSearch = v.object({
	cursor: v.optional(v.pipe(v.number(), v.minValue(0))),
	limit: v.fallback(v.pipe(v.number(), v.minValue(1)), DEFAULT_LIMIT),
	tag_type: v.optional(v.array(v.picklist(TAG_TYPES))),
	order_by: v.optional(v.picklist(["asc", "desc"])),
})

export const Route = createFileRoute("/tag/explore")({
	component: TagExplore,
	validateSearch: exploreSearch,
})
