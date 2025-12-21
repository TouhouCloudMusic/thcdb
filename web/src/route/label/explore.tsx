import { createFileRoute } from "@tanstack/solid-router"
import * as v from "valibot"

import { LabelExplore } from "~/view/label/explore"

const DEFAULT_LIMIT = 10

const exploreSearch = v.object({
	cursor: v.optional(v.pipe(v.number(), v.minValue(0))),
	limit: v.fallback(v.pipe(v.number(), v.minValue(1)), DEFAULT_LIMIT),
	founded_date_from: v.optional(v.string()),
	founded_date_to: v.optional(v.string()),
	is_dissolved: v.optional(v.boolean()),
	sort_by: v.optional(v.picklist(["created_at", "handled_at"])),
	order_by: v.optional(v.picklist(["asc", "desc"])),
})

export const Route = createFileRoute("/label/explore")({
	component: LabelExplore,
	validateSearch: exploreSearch,
})
