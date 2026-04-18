import { createFileRoute } from "@tanstack/solid-router"
import * as v from "valibot"

import { SearchPage } from "~/view/search"

const searchSchema = v.object({
	q: v.optional(v.string()),
	entity: v.optional(
		v.picklist([
			"all",
			"artist",
			"event",
			"label",
			"release",
			"song",
			"tag",
			"user_collection",
		]),
	),
	tab: v.optional(
		v.picklist([
			"artist",
			"release",
			"song",
			"event",
			"label",
			"tag",
			"user_collection",
		]),
	),
})

export const Route = createFileRoute("/search")({
	component: SearchPage,
	validateSearch: searchSchema,
})
