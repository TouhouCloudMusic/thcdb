import { createFileRoute } from "@tanstack/solid-router"
import * as v from "valibot"

import { EventExplore } from "~/view/event/explore"

const DEFAULT_LIMIT = 10

const exploreSearch = v.object({
	cursor: v.optional(v.pipe(v.number(), v.minValue(0))),
	limit: v.fallback(v.pipe(v.number(), v.minValue(1)), DEFAULT_LIMIT),
	start_date_from: v.optional(v.string()),
	start_date_to: v.optional(v.string()),
	order_by: v.optional(v.picklist(["asc", "desc"])),
})

export const Route = createFileRoute("/event/explore")({
	component: EventExplore,
	validateSearch: exploreSearch,
})
